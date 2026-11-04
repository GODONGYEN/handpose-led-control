let handPose;
let video;
let hands = [];
let ledSlider;
let message;
let serialPort;
let serialWriter;
let sending = false;
let connecting = false;
let lastSendTime = 0;
let lastDetectionTime = 0;

const handLines = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17],
  [17, 18], [18, 19], [19, 20]
];

function preload() {
  handPose = ml5.handPose({ maxHands: 1 });
}

function setup() {
  createCanvas(640, 480);
  message = createP("카메라 권한을 허용해 주세요.");
  ledSlider = createSlider(0, 255, 0, 1);
  ledSlider.style("width", "400px");
  ledSlider.attribute("disabled", "");
  const button = createButton("아두이노 연결");
  button.mousePressed(connectArduino);
  video = createCapture(VIDEO, () => {
    handPose.detectStart(video, gotHands);
    message.html("손바닥을 카메라에 보여 주세요.");
  });
  video.size(640, 480);
  video.hide();
}

function gotHands(results) {
  hands = results;
  lastDetectionTime = millis();
}

function draw() {
  background(30);
  if (video && video.elt.readyState >= 2) {
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();
  }
  let ledLevel = 0;
  const tracking = hands.length > 0 && millis() - lastDetectionTime < 500;
  if (tracking) {
    const points = hands[0].keypoints;
    stroke(0, 255, 120);
    strokeWeight(3);
    for (const [a, b] of handLines) {
      line(width - points[a].x, points[a].y,
           width - points[b].x, points[b].y);
    }
    noStroke();
    fill(0, 255, 120);
    for (const point of points) {
      circle(width - point.x, point.y, 10);
    }
    const thumb = points[4];
    const index = points[8];
    stroke(255, 220, 0);
    strokeWeight(5);
    line(width - thumb.x, thumb.y, width - index.x, index.y);
    const gap = dist(thumb.x, thumb.y, index.x, index.y);
    ledLevel = round(map(constrain(gap, 25, 220), 25, 220, 0, 255));
  }
  ledSlider.value(ledLevel);
  noStroke();
  fill(0, 180);
  rect(0, 0, width, 65);
  fill(255);
  textSize(19);
  text(tracking ? "손 인식 중" : "손을 카메라에 보여 주세요", 15, 25);
  text("LED 밝기: " + ledLevel + " / 255", 15, 52);
  if (serialWriter && !sending && millis() - lastSendTime >= 80) {
    lastSendTime = millis();
    sendLED(ledLevel);
  }
}

async function connectArduino() {
  if (serialWriter || connecting) return;
  if (!("serial" in navigator)) {
    message.html("Web Serial을 지원하는 Chrome에서 실행해 주세요.");
    return;
  }
  connecting = true;
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });
    serialWriter = serialPort.writable.getWriter();
    message.html("아두이노 연결 완료");
  } catch (error) {
    await clearSerial();
    message.html("연결 실패: 포트 선택과 시리얼 모니터를 확인하세요.");
    console.error(error);
  } finally {
    connecting = false;
  }
}

async function sendLED(value) {
  sending = true;
  try {
    await serialWriter.write(new Uint8Array([value]));
  } catch (error) {
    await clearSerial();
    message.html("연결이 끊겼습니다. 다시 연결해 주세요.");
  } finally {
    sending = false;
  }
}

async function clearSerial() {
  if (serialWriter) {
    try { serialWriter.releaseLock(); } catch (_) {}
    serialWriter = null;
  }
  if (serialPort) {
    try { await serialPort.close(); } catch (_) {}
    serialPort = null;
  }
}
