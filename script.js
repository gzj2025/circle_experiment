// ---------- 全局变量 ----------
const REPO_OWNER = 'gzj2025';
const REPO_NAME = 'circle_experiment';
const GITHUB_TOKEN = ''; // 可从环境变量或服务器注入
let data = {};
let circles = [];
let selected = null;

// ---------- 调试工具 ----------
function debug(msg) {
  console.log(msg);
  const debugDiv = document.getElementById('debug');
  if (debugDiv) {
    debugDiv.innerHTML = msg;
    debugDiv.style.display = 'block';
    setTimeout(() => { debugDiv.style.display = 'none'; }, 3000);
  }
}

// ---------- 页面切换 ----------
function switchPage(num) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page${num}`).classList.add("active");
  window.scrollTo(0, 0);
}

// ---------- 页面事件绑定 ----------
document.addEventListener("DOMContentLoaded", async () => {
  await syncPendingSubmissions(); // 页面加载时尝试同步未提交数据

  // 阶段1表单提交
  document.getElementById("infoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    data.name = document.getElementById("name").value;
    data.age = document.getElementById("age").value;
    data.alipayAccount = document.getElementById("alipayAccount").value;
    data.alipayName = document.getElementById("alipayName").value;

    await submitToGitHub({ stage: '基本信息提交' });

    switchPage(2);
    startStage1();
  });

  // 阶段1下一步
  document.getElementById("next1").onclick = async () => {
    data.beforeSelfSize = circles[0].r;
    data.afterSelfSize = circles[1].r;
    await submitToGitHub({ stage: '阶段1完成', beforeSelfSize: data.beforeSelfSize, afterSelfSize: data.afterSelfSize });
    switchPage(3);
    startStage2();
  };

  // 阶段2下一步
  document.getElementById("next2").onclick = async () => {
    data.childSize = circles[1].r;
    await submitToGitHub({ stage: '阶段2完成', childSize: data.childSize });
    switchPage(4);
    startStage3();
  };

  // 下载CSV并提交最终数据
  document.getElementById("download").onclick = async () => {
    const overlap = document.getElementById("overlapText").textContent.replace('重叠面积：', '');
    data.overlapArea = overlap;
    await submitToGitHub({ stage: '实验完成', overlapArea: overlap, finalData: true });
    downloadCSV();
    alert('实验数据已保存！');
  };

  // 返回按钮
  const backBtns = document.querySelectorAll("button[onclick*='switchPage']");
  backBtns.forEach(btn => btn.addEventListener('click', () => selected = null));
});

// ---------- 阶段1 ----------
function startStage1() {
  new p5(p => {
    p.setup = function () {
      let canvas = p.createCanvas(1000, 500);
      canvas.parent("canvas1");

      // 各占画布一半，互不重叠
      let r = 250;
      circles = [
        new Circle(p, 250, 250, r, "red", "生产前的自己"),
        new Circle(p, 750, 250, r, "blue", "生产后的自己")
      ];
    };

    p.draw = function () {
      p.background(255);
      circles.forEach(c => c.show());
    };

    p.mousePressed = () => selectCircle(p);
    p.mouseDragged = () => resizeCircle(p);
    p.mouseReleased = () => selected = null;
  });
}

// ---------- 阶段2 ----------
function startStage2() {
  new p5(p => {
    p.setup = function () {
      let canvas = p.createCanvas(800, 500);
      canvas.parent("canvas2");
      circles = [
        new Circle(p, 300, 250, data.afterSelfSize, "blue", "生产后的自己"),
        new Circle(p, 500, 250, 60, "green", "孩子")
      ];
    };
    p.draw = function () {
      p.background(255);
      circles.forEach(c => c.show());
    };
    p.mousePressed = () => selectCircle(p);
    p.mouseDragged = () => resizeCircle(p);
    p.mouseReleased = () => selected = null;
  });
}

// ---------- 阶段3 ----------
function startStage3() {
  new p5(p => {
    p.setup = function () {
      let canvas = p.createCanvas(800, 500);
      canvas.parent("canvas3");
      circles = [
        new Circle(p, 300, 250, data.afterSelfSize, "blue", "自己"),
        new Circle(p, 500, 250, data.childSize, "green", "孩子")
      ];
    };
    p.draw = function () {
      p.background(255);
      let overlap = intersectionArea(p, circles[0], circles[1]);
      p.fill(120);
      drawOverlap(p, circles[0], circles[1]);
      circles.forEach(c => c.show());
      document.getElementById("overlapText").textContent = `重叠面积：${overlap.toFixed(2)}`;
    };
    p.mousePressed = () => selectCircle(p);
    p.mouseDragged = () => moveCircle(p);
    p.mouseReleased = () => selected = null;
  });
}

// ---------- 通用类与函数 ----------
class Circle {
  constructor(p, x, y, r, col, label) {
    this.p = p; this.x = x; this.y = y; this.r = r; this.col = col; this.label = label;
  }
  show() {
    this.p.noFill();
    this.p.stroke(this.col);
    this.p.strokeWeight(3);
    this.p.ellipse(this.x, this.y, this.r * 2);
    this.p.fill(0);
    this.p.noStroke();
    this.p.textAlign(this.p.CENTER);
    this.p.text(this.label, this.x, this.y - this.r - 10);
  }
}

function selectCircle(p) {
  for (let c of circles) {
    if (p.dist(p.mouseX, p.mouseY, c.x, c.y) < c.r) {
      selected = c;
      break;
    }
  }
}

function resizeCircle(p) {
  if (selected) {
    let d = p.dist(p.mouseX, p.mouseY, selected.x, selected.y);
    selected.r = p.constrain(d, 30, 200);
  }
}

function moveCircle(p) {
  if (selected) {
    selected.x = p.constrain(p.mouseX, 100, 700);
    selected.y = p.constrain(p.mouseY, 50, 450);
  }
}

function intersectionArea(p, c1, c2) {
  let d = p.dist(c1.x, c1.y, c2.x, c2.y);
  if (d >= c1.r + c2.r) return 0;
  if (d <= Math.abs(c1.r - c2.r)) return Math.PI * Math.pow(Math.min(c1.r, c2.r), 2);
  let r1 = c1.r, r2 = c2.r;
  let alpha = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)) * 2;
  let beta = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)) * 2;
  return 0.5 * r2 * r2 * (beta - Math.sin(beta)) + 0.5 * r1 * r1 * (alpha - Math.sin(alpha));
}

function drawOverlap(p, c1, c2) {
  p.beginShape();
  for (let a = 0; a < p.TWO_PI; a += 0.01) {
    let x = c1.x + Math.cos(a) * c1.r;
    let y = c1.y + Math.sin(a) * c1.r;
    if (p.dist(x, y, c2.x, c2.y) < c2.r) p.vertex(x, y);
  }
  p.endShape(p.CLOSE);
}

function downloadCSV() {
  const overlap = document.getElementById("overlapText").textContent.replace('重叠面积：', '');
  const csv = [
    "姓名,年龄,支付宝账号,支付宝昵称,生产前自我半径,生产后自我半径,孩子半径,重叠面积",
    `${data.name},${data.age},${data.alipayAccount},${data.alipayName},${data.beforeSelfSize.toFixed(1)},${data.afterSelfSize.toFixed(1)},${data.childSize.toFixed(1)},${overlap}`
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${data.name}_experiment.csv`;
  a.click();
}

// ---------- GitHub 提交 ----------
async function submitToGitHub(additionalData = {}) {
  const submissionData = { ...data, ...additionalData, timestamp: new Date().toISOString(), userAgent: navigator.userAgent };

  // 获取IP地址
  try {
    const ipResp = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResp.json();
    submissionData.ip = ipData.ip;
  } catch (e) { submissionData.ip = '未知'; }

  try {
    const issueData = {
      title: `实验数据 - ${submissionData.name} - ${new Date(submissionData.timestamp).toLocaleDateString()}`,
      body: `## 参与者信息
- 姓名: ${submissionData.name}
- 年龄: ${submissionData.age}
- 支付宝账号: ${submissionData.alipayAccount}
- 支付宝昵称: ${submissionData.alipayName}

## 实验数据
- 生产前自我半径: ${submissionData.beforeSelfSize || ''}
- 生产后自我半径: ${submissionData.afterSelfSize || ''}
- 孩子半径: ${submissionData.childSize || ''}
- 重叠面积: ${submissionData.overlapArea || ''}

## 其他信息
- 提交阶段: ${submissionData.stage || '未知'}
- 时间戳: ${submissionData.timestamp}
- IP地址: ${submissionData.ip}`,
      labels: ['实验数据']
    };

    const resp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    });

    if (resp.ok) { console.log('数据已提交GitHub'); return true; }
    else { console.error('提交失败:', await resp.text()); saveToLocal(submissionData); return false; }
  } catch (e) { console.error('网络错误:', e); saveToLocal(submissionData); return false; }
}

// ---------- 本地缓存 ----------
function saveToLocal(submission) {
  const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
  pending.push(submission);
  localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
}

// ---------- 同步本地未提交数据 ----------
async function syncPendingSubmissions() {
  let pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
  if (pending.length === 0) return;

  debug(`发现 ${pending.length} 条未提交数据，尝试同步...`);

  for (let i = 0; i < pending.length; i++) {
    let item = pending[i];
    try {
      const issueData = {
        title: `实验数据 - ${item.name} - ${new Date(item.timestamp).toLocaleDateString()}`,
        body: `## 参与者信息
- 姓名: ${item.name}
- 年龄: ${item.age}
- 支付宝账号: ${item.alipayAccount}
- 支付宝昵称: ${item.alipayName}

## 实验数据
- 生产前自我半径: ${item.beforeSelfSize || ''}
- 生产后自我半径: ${item.afterSelfSize || ''}
- 孩子半径: ${item.childSize || ''}
- 重叠面积: ${item.overlapArea || ''}

## 其他信息
- 提交阶段: ${item.stage || '未知'}
- 时间戳: ${item.timestamp}
- IP地址: ${item.ip || '未知'}`,
        labels: ['实验数据']
      };

      const resp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(issueData)
      });

      if (resp.ok) {
        debug(`第 ${i + 1} 条本地数据同步成功`);
        pending.splice(i, 1);
        i--;
        localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
      } else {
        debug(`第 ${i + 1} 条同步失败`);
      }
    } catch (err) { console.error('同步错误:', err); }
  }

  if (pending.length === 0) debug('本地未提交数据已全部同步');
  else debug(`剩余 ${pending.length} 条数据未同步`);
}
