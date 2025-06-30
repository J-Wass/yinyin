// These common phrases have a higher weight. Other phrases are weighted at 10.
const frequencyWeights = {
  ni3hao3: 100,
  xie4xie5: 95,
  zao3shang4: 90,
  wan3shang4: 88,
  jin1tian1: 85,
  ming2tian1: 83,
  xian4zai4: 80,
  yi3qian2: 78,
  yi3hou4: 75,
  zhe4ge4: 73,
  na4ge4: 70,
  shen2me5: 68,
  zen3me5: 65,
  wei4shen2me5: 62,
  na3li3: 60,
  ji3dian3: 58,
  duo1shao3: 55,
  he2shui4: 53,
  chi1fan4: 50,
  shui4jiao4: 45,
  shang4ban1: 42,
  xia4ban1: 40,
  shang4xue2: 38,
  xia4xue2: 36,
  kan4dian4shi4: 34,
  ting1yin1yue4: 32,
  du2shu1: 30,
  xie3zi4: 28,
  hua4hua4: 26,
  chang4ge1: 24,
  tiao4wu3: 22,
  da3qiu2: 20,
  you2yong3: 18,
  pao3bu4: 16,
  san4bu4: 14,
  mai3dong1xi1: 12,
  hua1qian2: 10,
};

// Fill any missing phrases with default weight 10
for (const key in phrases) {
  if (!(key in frequencyWeights)) frequencyWeights[key] = 10;
}

// Persistent score storage
const SCORE_KEY = "pinyinScoreTracker";
let scoreTracker = JSON.parse(localStorage.getItem(SCORE_KEY) || "{}");

function getScore(phrase) {
  return scoreTracker[phrase] ?? 0;
}
function setScore(phrase, val) {
  scoreTracker[phrase] = val;
  localStorage.setItem(SCORE_KEY, JSON.stringify(scoreTracker));
  updateScoreInfo();
}

function calculateWeight(phrase) {
  const phraseScore = getScore(phrase);
  const phraseFreq = frequencyWeights[phrase] ?? 10;
  const scoreFactor = Math.max(1, 5 - phraseScore);
  return phraseFreq * scoreFactor;
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

  // Split the phrase into individual syllables
  const syllables = pinyin.match(/[a-zü]+[1-5]?/g) || [pinyin];

  return syllables
    .map((syllable) => {
      const m = syllable.match(/(.*?)([1-5])/);
      if (!m) return syllable; // No tone number, return as is

      const [_, base, t] = m;
      const tone = Number(t);

      // Handle neutral tone (5) - return base without tone mark
      if (tone === 5) return base;

      // Handle tones 1-4
      const toneIndex = tone - 1;
      for (const v of ["a", "o", "e", "i", "u", "ü"]) {
        if (base.includes(v)) {
          return base.replace(v, toneMarks[v][toneIndex]);
        }
      }
      return base;
    })
    .join(" ");
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

let currentPhrase = "";
let currentPinyin = "";

function updateScoreInfo() {
  scoreInfo.textContent = "Statistics";
  scoreInfo.style.cursor = "pointer";
  scoreInfo.style.textDecoration = "underline";
}

function showPracticePopup() {
  const modal = document.getElementById("practiceModal");
  const practiceList = document.getElementById("practiceList");

  // Get all tracked phrases and sort by score (lowest first - need most practice)
  const practiceItems = Object.entries(scoreTracker)
    .sort((a, b) => a[1] - b[1]) // Sort by score ascending
    .slice(0, 30) // Only take top 30 most difficult
    .map(([phrase, score]) => ({ phrase, score }));

  const totalPhrases = Object.keys(scoreTracker).length;

  if (practiceItems.length === 0) {
    practiceList.innerHTML =
      '<p style="text-align: center; color: #666; font-style: italic;">No statistics yet. Keep practicing!</p>';
  } else {
    practiceList.innerHTML =
      `
          <div style="text-align: center; margin-bottom: 15px; color: #666; font-size: 14px;">
              Tracked phrases: ${totalPhrases}
          </div>
          <div class="practice-header">
              <div>Phrase</div>
              <div>Score</div>
          </div>
      ` +
      practiceItems
        .map(({ phrase, score }) => {
          const scoreClass =
            score < 0 ? "score-low" : score < 5 ? "score-medium" : "score-high";
          return `
              <div class="practice-item" onclick="playPhrase('${phrase}')">
                  <div class="sound-text">
                      <span class="speaker-icon">🎧</span>
                      ${toAccented(phrase)} - ${phrases[phrase] || ""}
                  </div>
                  <div class="score-badge ${scoreClass}">${score}</div>
              </div>
          `;
        })
        .join("");
  }

  modal.style.display = "block";
}

function playPhrase(phrase) {
  // Find the corresponding audio files for each syllable in the phrase
  const syllables = phrase.match(/[a-zü]+[1-5]?/g) || [phrase];

  // Play each syllable in sequence
  (async function playSequentially() {
    for (const syllable of syllables) {
      const audioFile = Object.keys(pinyinPaths).find((file) =>
        file.startsWith(syllable + ".")
      );
      if (audioFile) {
        const url = pinyinPaths[audioFile];
        if (url) {
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
      }
    }
  })();
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

// Make playPhrase globally accessible
window.playPhrase = playPhrase;

function generatePinyin() {
  if (!Object.keys(phrases).length) {
    alert("Please populate phrases with valid phrases first.");
    return;
  }

  const phraseChoices = Object.keys(phrases);
  const weights = phraseChoices.map((phrase) => calculateWeight(phrase));

  currentPhrase = weightedRandom(phraseChoices, weights);
  currentPinyin = currentPhrase;

  // Show the pinyin, Chinese characters, and English translation
  const chineseChars = phrases[currentPhrase] || "";
  pinyinDisplay.textContent = `${toAccented(
    currentPinyin
  )} - ${chineseChars} (${translations[currentPinyin] || ""})`;

  // Enable play button, disable right/wrong buttons initially
  playBtn.disabled = false;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;
}

async function playAudio() {
  if (!currentPinyin) {
    alert("No phrase selected. Please wait for the next one.");
    return;
  }

  playBtn.disabled = true;

  const chineseChars = phrases[currentPinyin] || "";

  // Split the phrase into syllables and play each one
  const syllables = currentPinyin.match(/[a-zü]+[1-5]?/g) || [currentPinyin];
  const chineseCharsArray = chineseChars.split("");

  // Remove TTS functionality
  // Play each syllable in sequence without TTS at the end
  for (const syllable of syllables) {
    const audioFile = Object.keys(pinyinPaths).find((file) =>
      file.startsWith(syllable + ".")
    );
    if (audioFile) {
      const url = pinyinPaths[audioFile];
      if (url) {
        try {
          await new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.onplay = () => {
              // Highlight the current syllable and corresponding Chinese character in light gray, keeping the English translation visible
              pinyinDisplay.innerHTML =
                syllables
                  .map((s, index) =>
                    s === syllable
                      ? `<span style='background-color: #d3d3d3;'>${toAccented(
                          s
                        )}</span>`
                      : toAccented(s)
                  )
                  .join(" ") +
                ` - ` +
                chineseCharsArray
                  .map((char, index) =>
                    syllables[index] === syllable
                      ? `<span style='background-color: #d3d3d3;'>${char}</span>`
                      : char
                  )
                  .join("") +
                ` (${translations[currentPinyin] || ""})`;
            };
            audio.onended = resolve;
            audio.onerror = reject;
            audio.play().catch(reject);
          });
        } catch (e) {
          console.error("Audio error:", e);
        }
      }
    }
  }

  // After all syllables are played, reset the display to show pinyin, Mandarin characters, and translation without highlight
  pinyinDisplay.innerHTML = `${toAccented(currentPinyin)} - ${chineseChars} (${
    translations[currentPinyin] || ""
  })`;

  // Re-enable play button and enable right/wrong buttons after audio finishes
  playBtn.disabled = false;
  rightBtn.disabled = false;
  wrongBtn.disabled = false;
}

function adjustScores(correct) {
  let val = getScore(currentPhrase);
  if (correct) {
    val = Math.min(val + 1, 10);
  } else {
    val = val - 1;
  }
  setScore(currentPhrase, val);
}

playBtn.addEventListener("click", playAudio);
rightBtn.addEventListener("click", () => {
  adjustScores(true);
  pinyinDisplay.textContent = "👍 Nice!";
  playBtn.disabled = true;
  rightBtn.disabled = true;
  wrongBtn.disabled = true;

  // Automatically generate next phrase after a short delay
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

  // Automatically generate next phrase after a short delay
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
