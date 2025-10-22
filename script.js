// 配置 GitHub 数据提交
// 从环境变量获取，而不是硬编码
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'gzj2025';
const REPO_NAME = 'circle_experiment';

let data = {};
let circles = [];
let stage = 1;
let selected = null;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("infoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    data.name = document.getElementById("name").value;
    data.age = document.getElementById("age").value;
    data.alipayAccount = document.getElementById("alipayAccount").value;
    data.alipayName = document.getElementById("alipayName").value;
    
    // 新增：提交基本信息
    await submitToGitHub({ stage: '基本信息提交' });
    
    switchPage(2);
    startStage1();
  });

  document.getElementById("next1").onclick = async () => {
    data.beforeSelfSize = circles[0].r;
    data.afterSelfSize = circles[1].r;
    
    // 新增：提交阶段1数据
    await submitToGitHub({ 
      stage: '阶段1完成',
      beforeSelfSize: data.beforeSelfSize,
      afterSelfSize: data.afterSelfSize
    });
    
    switchPage(3);
    startStage2();
  };

  document.getElementById("next2").onclick = async () => {
    data.childSize = circles[1].r;
    
    // 新增：提交阶段2数据
    await submitToGitHub({ 
      stage: '阶段2完成',
      childSize: data.childSize
    });
    
    switchPage(4);
    startStage3();
  };

  document.getElementById("download").onclick = async () => {
    const overlap = document.getElementById("overlapText").textContent.replace('重叠面积：','');
    data.overlapArea = overlap;
    
    // 新增：提交最终数据
    const success = await submitToGitHub({ 
      stage: '实验完成',
      overlapArea: overlap,
      finalData: true
    });
    
    if (success) {
      alert('实验数据已成功保存到服务器！');
    }
    
    downloadCSV();
  };
});

function switchPage(num) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page${num}`).classList.add("active");
}

// ---------- 阶段1 ----------
function startStage1() {
  new p5((p) => {
    p.setup = function() {
      let canvas = p.createCanvas(800, 500);
      canvas.parent("canvas1");
      circles = [
        new Circle(p, 300, 250, 80, "red", "生产前的自己"),
        new Circle(p, 500, 250, 80, "blue", "生产后的自己")
      ];
    };

    p.draw = function() {
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
  new p5((p) => {
    p.setup = function() {
      let canvas = p.createCanvas(800, 500);
      canvas.parent("canvas2");
      circles = [
        new Circle(p, 300, 250, data.afterSelfSize, "blue", "生产后的自己"),
        new Circle(p, 500, 250, 60, "green", "孩子")
      ];
    };

    p.draw = function() {
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
  new p5((p) => {
    p.setup = function() {
      let canvas = p.createCanvas(800, 500);
      canvas.parent("canvas3");
      circles = [
        new Circle(p, 300, 250, data.afterSelfSize, "blue", "自己"),
        new Circle(p, 500, 250, data.childSize, "green", "孩子")
      ];
    };

    p.draw = function() {
      p.background(255);
      let overlap = intersectionArea(p, circles[0], circles[1]);
      p.fill(120);
      drawOverlap(p, circles[0], circles[1]);
      circles.forEach(c => c.show());
      document.getElementById("overlapText").textContent =
        `重叠面积：${overlap.toFixed(2)}`;
    };

    p.mousePressed = () => selectCircle(p);
    p.mouseDragged = () => moveCircle(p);
    p.mouseReleased = () => selected = null;
  });
}

// ---------- 通用类与函数 ----------
class Circle {
  constructor(p, x, y, r, col, label) {
    this.p = p; this.x = x; this.y = y;
    this.r = r; this.col = col; this.label = label;
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
    let d = p.dist(p.mouseX, p.mouseY, c.x, c.y);
    if (d < c.r) { selected = c; break; }
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
  }
}

function intersectionArea(p, c1, c2) {
  let d = p.dist(c1.x, c1.y, c2.x, c2.y);
  if (d >= c1.r + c2.r) return 0;
  if (d <= Math.abs(c1.r - c2.r))
    return Math.PI * Math.pow(Math.min(c1.r, c2.r), 2);
  let r1 = c1.r, r2 = c2.r;
  let alpha = Math.acos((d*d + r1*r1 - r2*r2) / (2*d*r1)) * 2;
  let beta = Math.acos((d*d + r2*r2 - r1*r1) / (2*d*r2)) * 2;
  return 0.5 * r2*r2 * (beta - Math.sin(beta)) +
         0.5 * r1*r1 * (alpha - Math.sin(alpha));
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
  const overlap = document.getElementById("overlapText").textContent.replace('重叠面积：','');
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

// ========== 新增的数据提交函数 ==========

// 提交数据到 GitHub Issues
async function submitToGitHub(additionalData = {}) {
    const submissionData = {
        ...data,
        ...additionalData,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };

    // 尝试获取IP地址
    try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        submissionData.ip = ipData.ip;
    } catch (error) {
        submissionData.ip = '未知';
    }

    const issueData = {
        title: `实验数据 - ${data.name} - ${new Date().toLocaleDateString()}`,
        body: `
## 参与者信息
- **姓名**: ${data.name}
- **年龄**: ${data.age}
- **支付宝账号**: ${data.alipayAccount}
- **支付宝昵称**: ${data.alipayName}

## 实验数据
- **生产前自我半径**: ${data.beforeSelfSize || ''}
- **生产后自我半径**: ${data.afterSelfSize || ''}
- **孩子半径**: ${data.childSize || ''}
- **重叠面积**: ${submissionData.overlapArea || ''}

## 其他信息
- **提交阶段**: ${additionalData.stage || '未知'}
- **时间戳**: ${submissionData.timestamp}
- **IP地址**: ${submissionData.ip}
        `,
        labels: ['实验数据']
    };

    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(issueData)
        });
        
        if (response.ok) {
            console.log('数据已成功提交到GitHub Issues');
            return true;
        } else {
            console.error('提交失败:', await response.text());
            saveToLocalStorage(submissionData);
            return false;
        }
    } catch (error) {
        console.error('网络错误:', error);
        saveToLocalStorage(submissionData);
        return false;
    }
}

// 本地存储备用
function saveToLocalStorage(data) {
    const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
    pending.push(data);
    localStorage.setItem('pendingSubmissions', JSON.stringify(pending));
}
