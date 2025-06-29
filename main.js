// These common sounds have a higher weight. Other sounds are weighted at 10.
const frequencyWeights = {
  shi4: 100,
  de5: 95,
  bu4: 90,
  le5: 88,
  ren2: 85,
  zai4: 83,
  you3: 80,
  wo3: 78,
  ta1: 75,
  zhe4: 73,
  yi1: 70,
  ge4: 68,
  he2: 65,
  ye3: 62,
  zhong1: 60,
  guo2: 58,
  shang4: 55,
  xue2: 53,
  xiao3: 50,
  hao3: 45,
  ma1: 42,
  ni3: 40,
  men5: 38,
  lai2: 36,
  kan4: 34,
  shuo1: 32,
  xin1: 30,
  dui4: 28,
  na3: 26,
  qu4: 24,
  hui4: 22,
  chi1: 20,
};

// Fill any missing sounds with default weight 10
for (const key in pinyinPaths) {
  const base = key.split(".")[0];
  if (!(base in frequencyWeights)) frequencyWeights[base] = 10;
}

// Persistent score storage
const SCORE_KEY = "pinyinScoreTracker";
let scoreTracker = JSON.parse(localStorage.getItem(SCORE_KEY) || "{}");

function getScore(base) {
  return scoreTracker[base] ?? 0;
}
function setScore(base, val) {
  scoreTracker[base] = val;
  localStorage.setItem(SCORE_KEY, JSON.stringify(scoreTracker));
  updateScoreInfo();
}

function calculateWeight(base) {
  const baseScore = getScore(base);
  const baseFreq = frequencyWeights[base] ?? 10;
  const scoreFactor = Math.max(1, 5 - baseScore);
  return baseFreq * scoreFactor;
}

// Convert numbered pinyin to accented
function toAccented(pinyin) {
  const toneMarks = {
    a: ["ā", "á", "ǎ", "à"],
    o: ["ō", "ó", "ǒ", "ò"],
    e: ["ē", "é", "ě", "è"],
    i: ["ī", "í", "ǐ", "ì"],
    u: ["ū", "ú", "ǔ", "ù"],
    ü: ["ǖ", "ǘ", "ǚ", "ǜ"],
  };
  const m = pinyin.match(/(.*?)([1-4])/);
  if (!m) return pinyin;
  const [_, base, t] = m;
  const tone = Number(t) - 1;
  for (const v of ["a", "o", "e", "i", "u", "ü"]) {
    if (base.includes(v)) {
      return base.replace(v, toneMarks[v][tone]);
    }
  }
  return base;
}

// Weighted random choice
function weightedRandom(arr, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < arr.length; i++) {
    if (r < weights[i]) return arr[i];
    r -= weights[i];
  }
  return arr[arr.length - 1];
}

// --- UI Elements ---
const playBtn = document.getElementById("play-btn");
const rightBtn = document.getElementById("right-btn");
const wrongBtn = document.getElementById("wrong-btn");
const pinyinDisplay = document.getElementById("pinyin-display");
const scoreInfo = document.getElementById("score-info");

let currentBases = [];
let currentSelected = [];

function updateScoreInfo() {
  scoreInfo.textContent = "Statistics";
  scoreInfo.style.cursor = "pointer";
  scoreInfo.style.textDecoration = "underline";
}

function showPracticePopup() {
  const modal = document.getElementById("practiceModal");
  const practiceList = document.getElementById("practiceList");

  // Get all tracked syllables and sort by score (lowest first - need most practice)
  const practiceItems = Object.entries(scoreTracker)
    .sort((a, b) => a[1] - b[1]) // Sort by score ascending
    .slice(0, 30) // Only take top 30 most difficult
    .map(([base, score]) => ({ base, score }));

  const totalBases = Object.keys(scoreTracker).length;

  if (practiceItems.length === 0) {
    practiceList.innerHTML =
      '<p style="text-align: center; color: #666; font-style: italic;">No statistics yet. Keep practicing!</p>';
  } else {
    practiceList.innerHTML =
      `
          <div style="text-align: center; margin-bottom: 15px; color: #666; font-size: 14px;">
              Tracked sounds: ${totalBases}
          </div>
          <div class="practice-header">
              <div>Sound</div>
              <div>Score</div>
          </div>
      ` +
      practiceItems
        .map(({ base, score }) => {
          const scoreClass =
            score < 0 ? "score-low" : score < 5 ? "score-medium" : "score-high";
          return `
              <div class="practice-item" onclick="playSound('${base}')">
                  <div class="sound-text">
                      <span class="speaker-icon">🎧</span>
                      ${toAccented(base)}
                  </div>
                  <div class="score-badge ${scoreClass}">${score}</div>
              </div>
          `;
        })
        .join("");
  }

  modal.style.display = "block";
}

function playSound(base) {
  // Find the corresponding audio file
  const audioFile = Object.keys(pinyinPaths).find((file) =>
    file.startsWith(base + ".")
  );
  if (audioFile) {
    const url = pinyinPaths[audioFile];
    if (url) {
      const audio = new Audio(url);
      audio.play().catch((e) => console.error("Audio error:", e));
    }
  }
}

function closeModal() {
  const modal = document.getElementById("practiceModal");
  modal.style.display = "none";
}

// Add click event listener to score info
scoreInfo.addEventListener("click", showPracticePopup);

// Initialize the display
updateScoreInfo();

// Add event listeners for modal
document.querySelector(".close").addEventListener("click", closeModal);
document
  .getElementById("practiceModal")
  .addEventListener("click", function (e) {
    if (e.target === this) {
      closeModal();
    }
  });

// Make playSound globally accessible
window.playSound = playSound;

function generatePinyin() {
  if (!Object.keys(pinyinPaths).length) {
    alert("Please populate pinyinPaths with valid MP3 URLs first.");
    return;
  }

  const choices = Object.keys(pinyinPaths);
  const weights = choices.map((s) => calculateWeight(s.split(".")[0]));

  currentBases = [];
  currentSelected = [];
  const howMany = 1 + Math.floor(Math.random() * 2); // 1 or 2

  for (let i = 0; i < howMany; i++) {
    const file = weightedRandom(choices, weights);
    currentSelected.push(file);
    currentBases.push(file.split(".")[0]);
  }

  // Show the pinyin
  pinyinDisplay.textContent = currentBases.map(toAccented).join(" ");

  // Enable play button, disable right/wrong buttons initially
  playBtn.disabled = false;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;
}

async function playAudio() {
  if (!currentSelected.length) {
    alert("No pinyin selected. Please wait for the next one.");
    return;
  }

  playBtn.disabled = true;

  // Play the audio
  for (const file of currentSelected) {
    const url = pinyinPaths[file];
    if (!url) continue;
    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio(url);
        audio.onended = resolve;
        audio.onerror = reject;
        audio.play().catch(reject);
      });
    } catch (e) {
      console.error("Audio error:", e);
    }
  }

  // Re-enable play button and enable right/wrong buttons after audio finishes
  playBtn.disabled = false;
  rightBtn.disabled = false;
  wrongBtn.disabled = false;
}

function adjustScores(correct) {
  currentBases.forEach((base) => {
    let val = getScore(base);
    if (correct) {
      val = Math.min(val + 1, 10);
    } else {
      val = val - 1;
    }
    setScore(base, val);
  });
}

playBtn.addEventListener("click", playAudio);
rightBtn.addEventListener("click", () => {
  adjustScores(true);
  pinyinDisplay.textContent = "👍 Nice!";
  playBtn.disabled = true;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;

  // Automatically generate next pinyin after a short delay
  setTimeout(() => {
    generatePinyin();
  }, 1000);
});
wrongBtn.addEventListener("click", () => {
  adjustScores(false);
  pinyinDisplay.textContent = "📚 Keep practicing!";
  playBtn.disabled = true;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;

  // Automatically generate next pinyin after a short delay
  setTimeout(() => {
    generatePinyin();
  }, 1000);
});

// Start the game automatically
generatePinyin();

// Add keyboard shortcuts
document.addEventListener("keydown", function (event) {
  // Only handle number keys 1, 2, 3
  if (event.key >= "1" && event.key <= "3") {
    event.preventDefault(); // Prevent default behavior

    switch (event.key) {
      case "1":
        if (!playBtn.disabled) {
          playAudio();
        }
        break;
      case "2":
        if (!rightBtn.disabled) {
          adjustScores(true);
          pinyinDisplay.textContent = "👍 Nice!";
          playBtn.disabled = true;
          rightBtn.disabled = true;
          wrongBtn.disabled = true;

          setTimeout(() => {
            generatePinyin();
          }, 1000);
        }
        break;
      case "3":
        if (!wrongBtn.disabled) {
          adjustScores(false);
          pinyinDisplay.textContent = "📚 Keep practicing!";
          playBtn.disabled = true;
          rightBtn.disabled = true;
          wrongBtn.disabled = true;

          setTimeout(() => {
            generatePinyin();
          }, 1000);
        }
        break;
    }
  }
});
