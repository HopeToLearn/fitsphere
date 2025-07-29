let timer;
let time = 0;
let distance = 0;
let speed = 0;
let currentActivity = '';
let workouts = [];
let isPaused = false;
let pausedTime = 0;

// Load from localStorage if exists
if (localStorage.getItem("workouts")) {
  workouts = JSON.parse(localStorage.getItem("workouts"));
}

function switchTab(tab) {
  const tabs = ['home', 'nutrition', 'sleep'];
  tabs.forEach(t => {
    document.getElementById(`tab-content-${t}`).classList.add('hidden');
    document.getElementById(`tab-${t}`).classList.remove('active');
  });
  document.getElementById(`tab-content-${tab}`).classList.remove('hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

function selectGender(gender) {
  document.getElementById('gender').value = gender;
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.getAttribute('data-gender') === gender);
  });
}

function login() {
  const username = document.getElementById("username").value;
  const age = parseInt(document.getElementById("age").value, 10);
  const gender = document.getElementById("gender").value;
  const heightFeet = parseInt(document.getElementById("height-feet").value, 10);
  const heightInches = parseInt(document.getElementById("height-inches").value, 10);
  const weightLbs = parseFloat(document.getElementById("weight-lbs").value);
  const isPro = document.getElementById("pro-version").checked;

  if (username.trim() === "") {
    showNotification("Please enter your name", "error");
    return;
  }
  if (!age || age < 5 || age > 120) {
    showNotification("Please enter a valid age", "error");
    return;
  }
  if (!gender) {
    showNotification("Please select your gender", "error");
    return;
  }
  if (!heightFeet || heightFeet < 3 || heightFeet > 8) {
    showNotification("Please enter a valid height (feet)", "error");
    return;
  }
  if (heightInches === undefined || heightInches < 0 || heightInches > 11) {
    showNotification("Please enter a valid height (inches)", "error");
    return;
  }
  if (!weightLbs || weightLbs < 50 || weightLbs > 700) {
    showNotification("Please enter a valid weight (lbs)", "error");
    return;
  }

  // Convert to cm/kg for calculations
  const height = Math.round((heightFeet * 30.48) + (heightInches * 2.54));
  const weight = Math.round(weightLbs * 0.453592);

  const userInfo = { username, age, gender, height, weight, isPro, heightFeet, heightInches, weightLbs };
  localStorage.setItem("userInfo", JSON.stringify(userInfo));
  localStorage.setItem("username", username);

  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("user-display").innerText = username;
  loadHistory();
  updateStats();
  switchTab('home');
}

function logout() {
  localStorage.removeItem("username");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("username").value = "";
  if (timer) {
    stopWorkout();
  }
}

function startWorkout() {
  if (timer && !isPaused) return; // Already running

  currentActivity = document.getElementById("activity").value;
  
  if (isPaused) {
    // Resume from pause
    isPaused = false;
    pausedTime = 0;
  } else {
    // Start new workout
    time = 0;
    distance = 0;
    speed = 0;
  }

  timer = setInterval(() => {
    time++;
    distance += 0.02; // Simulated distance
    speed = (distance / (time / 3600)).toFixed(1); // km/h

    updateTimerDisplay();
    updateCurrentStats();
  }, 1000);

  updateButtonStates();
  showNotification(`Started ${currentActivity} workout!`, "success");
}

function pauseWorkout() {
  if (!timer || isPaused) return;

  clearInterval(timer);
  timer = null;
  isPaused = true;
  pausedTime = time;

  updateButtonStates();
  showNotification("Workout paused", "info");
}

function stopWorkout() {
  if (!timer && !isPaused) return;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  // Get user info for calorie calculation
  const userInfo = JSON.parse(localStorage.getItem("userInfo") || '{}');
  const calories = calculateCalories(userInfo, currentActivity, time, userInfo.weight, userInfo.age, userInfo.gender);
  const benefit = getWorkoutBenefit(currentActivity);

  // Save workout
  const workout = {
    activity: currentActivity,
    time: time,
    distance: parseFloat(distance.toFixed(2)),
    speed: parseFloat(speed),
    date: new Date().toLocaleString(),
    duration: formatTime(time),
    calories,
    benefit,
    userGroup: getUserGroup(userInfo),
    username: userInfo.username
  };

  workouts.push(workout);
  localStorage.setItem("workouts", JSON.stringify(workouts));
  
  // Reset state
  time = 0;
  distance = 0;
  speed = 0;
  isPaused = false;
  pausedTime = 0;
  currentActivity = '';

  updateTimerDisplay();
  updateCurrentStats();
  updateButtonStates();
  loadHistory();
  updateStats();
  updateLeaderboard();
  updateWorkoutChart();

  showWorkoutSummary(workout);
  showNotification("Workout saved!", "success");
}

function updateTimerDisplay() {
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const seconds = time % 60;

  document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
  document.getElementById("minutes").innerText = minutes.toString().padStart(2, '0');
  document.getElementById("seconds").innerText = seconds.toString().padStart(2, '0');
}

function updateCurrentStats() {
  document.getElementById("distance").innerText = distance.toFixed(2);
  document.getElementById("speed").innerText = speed;
}

function updateButtonStates() {
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stopBtn = document.getElementById("stop-btn");

  if (timer && !isPaused) {
    // Workout running
    startBtn.classList.add("hidden");
    pauseBtn.classList.remove("hidden");
    stopBtn.classList.remove("hidden");
  } else if (isPaused) {
    // Workout paused
    startBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    stopBtn.classList.remove("hidden");
  } else {
    // No workout
    startBtn.classList.remove("hidden");
    pauseBtn.classList.add("hidden");
    stopBtn.classList.add("hidden");
  }
}

function loadHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  if (workouts.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">No workouts yet. Start your first workout!</p>';
    updateWorkoutChart();
    return;
  }

  workouts.slice().reverse().forEach((workout, index) => {
    const item = document.createElement("div");
    item.className = "workout-item";
    
    item.innerHTML = `
      <div class="workout-header">
        <span class="activity">${workout.activity}</span>
        <span class="date">${workout.date}</span>
      </div>
      <div class="stats">
        <span><i class="fas fa-clock"></i> ${workout.duration}</span>
        <span><i class="fas fa-route"></i> ${workout.distance} km</span>
        <span><i class="fas fa-tachometer-alt"></i> ${workout.speed} km/h</span>
        <span><i class='fas fa-fire'></i> ${workout.calories} kcal</span>
        <button class="btn-secondary share-btn" onclick="shareWorkout(${JSON.stringify(workout).replace(/"/g, '&quot;')})" style="font-size: 0.8rem; padding: 0.3rem 0.6rem;">
          <i class="fas fa-share"></i>
        </button>
      </div>
    `;
    
    list.appendChild(item);
  });
  updateWorkoutChart();
}

function updateWorkoutChart() {
  const ctx = document.getElementById('workout-chart');
  
  if (workoutChart) {
    workoutChart.destroy();
  }

  if (workouts.length === 0) return;

  const last7Workouts = workouts.slice(-7);
  const labels = last7Workouts.map(w => w.activity);
  const calories = last7Workouts.map(w => w.calories);
  const times = last7Workouts.map(w => w.time / 60); // Convert to minutes

  workoutChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Calories Burned',
        data: calories,
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        yAxisID: 'y'
      }, {
        label: 'Time (minutes)',
        data: times,
        borderColor: 'rgba(255, 107, 107, 1)',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        yAxisID: 'y1'
      }]
    },
    options: {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: 'Recent Workout Performance'
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Calories'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Time (minutes)'
          },
          grid: {
            drawOnChartArea: false,
          },
        }
      }
    }
  });
}

function updateStats() {
  const totalTime = workouts.reduce((sum, w) => sum + w.time, 0);
  const totalDistance = workouts.reduce((sum, w) => sum + w.distance, 0);
  const totalWorkouts = workouts.length;

  document.getElementById("total-time").innerText = formatTime(totalTime);
  document.getElementById("total-distance").innerText = `${totalDistance.toFixed(1)} km`;
  document.getElementById("total-workouts").innerText = totalWorkouts;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

function clearHistory() {
  if (confirm("Are you sure you want to clear all workout history? This cannot be undone.")) {
    workouts = [];
    localStorage.removeItem("workouts");
    loadHistory();
    updateStats();
    showNotification("History cleared", "info");
  }
}

function exportData() {
  if (workouts.length === 0) {
    showNotification("No data to export", "error");
    return;
  }

  const csvContent = "data:text/csv;charset=utf-8," 
    + "Activity,Date,Duration,Distance (km),Speed (km/h)\n"
    + workouts.map(w => 
        `${w.activity},${w.date},${w.duration},${w.distance},${w.speed}`
      ).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "fitsphere_workouts.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification("Data exported successfully!", "success");
}

function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation keyframes
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function calculateCalories(user, activity, seconds, weight, age, gender) {
  // MET values for activities (approximate)
  const METS = {
    Running: 9.8,
    Cycling: 7.5,
    Swimming: 8.0,
    Walking: 3.8,
    Hiking: 6.0,
    Climbing: 8.0
  };
  const met = METS[activity] || 6.0;
  // Calories = MET * weight(kg) * time(hr)
  const hours = seconds / 3600;
  let calories = met * (user.weight || weight || 70) * hours;
  // Adjust for age/gender (optional, simple factor)
  if (user.gender === 'female' || gender === 'female') calories *= 0.95;
  if ((user.age || age) > 50) calories *= 0.95;
  return Math.round(calories);
}

function getWorkoutBenefit(activity) {
  const benefits = {
    Running: "Improves cardiovascular endurance, strengthens leg muscles, boosts metabolism, and supports mental health.",
    Cycling: "Enhances cardiovascular fitness, tones lower body, and is gentle on joints.",
    Swimming: "Full-body workout, improves lung capacity, and builds endurance.",
    Walking: "Supports heart health, aids weight management, and reduces stress.",
    Hiking: "Strengthens lower body, improves balance, and boosts mood.",
    Climbing: "Builds upper body and core strength, improves flexibility, and sharpens focus."
  };
  return benefits[activity] || "Great for overall fitness and well-being!";
}

function getUserGroup(user) {
  if (!user || !user.age || !user.gender) return "Unknown";
  let ageGroup = '';
  if (user.age < 18) ageGroup = 'Youth';
  else if (user.age < 35) ageGroup = 'Young Adult';
  else if (user.age < 55) ageGroup = 'Adult';
  else ageGroup = 'Senior';
  return `${user.gender}-${ageGroup}`;
}

function showWorkoutSummary(workout) {
  // Show a modal or notification with calories and benefit
  showNotification(
    `<strong>Workout Complete!</strong><br>You burned <b>${workout.calories} kcal</b>.<br>${workout.benefit}`,
    "success"
  );
}

function updateLeaderboard() {
  const activity = document.getElementById('leaderboard-activity').value;
  const group = document.getElementById('leaderboard-group').value;
  const leaderboardList = document.getElementById('leaderboard-list');

  // Aggregate by user, activity, and group
  const userWorkouts = {};
  (JSON.parse(localStorage.getItem('workouts') || '[]')).forEach(w => {
    if (w.activity !== activity) return;
    if (group !== 'all' && w.userGroup !== group) return;
    const name = w.username || (w.userInfo && w.userInfo.username) || w.user || 'Anonymous';
    if (!userWorkouts[name]) {
      userWorkouts[name] = { total: 0, calories: 0, group: w.userGroup || '', name };
    }
    userWorkouts[name].total += w.time;
    userWorkouts[name].calories += w.calories || 0;
  });
  // Convert to array and sort by total time descending
  const sorted = Object.values(userWorkouts).sort((a, b) => b.total - a.total);

  leaderboardList.innerHTML = '';
  if (sorted.length === 0) {
    leaderboardList.innerHTML = '<p style="text-align:center;color:#888;">No data for this activity/group yet.</p>';
    return;
  }
  sorted.slice(0, 10).forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'leaderboard-entry' + (i === 0 ? ' top1' : i === 1 ? ' top2' : i === 2 ? ' top3' : '');
    div.innerHTML = `
      <span class="leaderboard-rank">${i + 1}</span>
      <span class="leaderboard-name">${entry.name}</span>
      <span class="leaderboard-time">${formatTime(entry.total)}</span>
      <span class="leaderboard-calories"><i class='fas fa-fire'></i> ${entry.calories} kcal</span>
    `;
    leaderboardList.appendChild(div);
  });
}

// Real Nutrition Data Lookup & Barcode Scanning
let nutritionChart = null;
let workoutChart = null;

async function searchFoodDatabase(query) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=5`);
    const data = await response.json();
    if (data.products && data.products.length > 0) {
      const product = data.products[0];
      return {
        name: product.product_name || query,
        calories: product.nutriments?.energy_100g ? Math.round(product.nutriments.energy_100g / 4.184) : 0,
        protein: product.nutriments?.proteins_100g || 0,
        carbs: product.nutriments?.carbohydrates_100g || 0,
        fat: product.nutriments?.fat_100g || 0,
        vitamins: extractVitamins(product),
        sweeteners: hasSweeteners(product),
        caffeine: product.nutriments?.caffeine_100g || 0
      };
    }
  } catch (error) {
    console.error('Error fetching food data:', error);
  }
  return null;
}

function extractVitamins(product) {
  const vitamins = [];
  if (product.nutriments?.vitamin_a_100g) vitamins.push('A');
  if (product.nutriments?.vitamin_c_100g) vitamins.push('C');
  if (product.nutriments?.vitamin_d_100g) vitamins.push('D');
  if (product.nutriments?.vitamin_e_100g) vitamins.push('E');
  if (product.nutriments?.vitamin_b1_100g) vitamins.push('B1');
  if (product.nutriments?.vitamin_b2_100g) vitamins.push('B2');
  if (product.nutriments?.vitamin_b6_100g) vitamins.push('B6');
  if (product.nutriments?.vitamin_b12_100g) vitamins.push('B12');
  return vitamins.join(', ') || 'None detected';
}

function hasSweeteners(product) {
  const sweetenerKeywords = ['aspartame', 'sucralose', 'saccharin', 'acesulfame', 'stevia'];
  const ingredients = (product.ingredients_text || '').toLowerCase();
  return sweetenerKeywords.some(keyword => ingredients.includes(keyword)) ? 'Yes' : 'No';
}

function toggleBarcodeScanner() {
  const scanner = document.getElementById('barcode-scanner');
  scanner.classList.toggle('hidden');
  if (!scanner.classList.contains('hidden')) {
    startBarcodeScanner();
  } else {
    stopBarcodeScanner();
  }
}

function startBarcodeScanner() {
  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#interactive'),
      constraints: {
        width: 480,
        height: 320,
        facingMode: "environment"
      },
    },
    decoder: {
      readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"]
    }
  }, function(err) {
    if (err) {
      console.error('Scanner error:', err);
      showNotification('Camera access denied or not available', 'error');
      return;
    }
    Quagga.start();
  });

  Quagga.onDetected(async function(result) {
    const code = result.codeResult.code;
    stopBarcodeScanner();
    document.getElementById('barcode-scanner').classList.add('hidden');
    
    showNotification('Barcode detected! Searching database...', 'info');
    const foodData = await searchFoodDatabase(code);
    if (foodData) {
      document.getElementById('food-input').value = foodData.name;
      showNotification(`Found: ${foodData.name}`, 'success');
    } else {
      showNotification('Product not found in database', 'error');
    }
  });
}

function stopBarcodeScanner() {
  if (Quagga) {
    Quagga.stop();
  }
}

function closeBarcodeScanner() {
  stopBarcodeScanner();
  document.getElementById('barcode-scanner').classList.add('hidden');
}

// Enhanced Nutrition Tracking with Real Data
async function addFoodEntry() {
  const foodInput = document.getElementById('food-input');
  const food = foodInput.value.trim();
  if (!food) {
    showNotification('Please enter a food name or brand.', 'error');
    return;
  }

  showNotification('Searching food database...', 'info');
  const foodData = await searchFoodDatabase(food);
  
  if (foodData) {
    const entry = {
      food: foodData.name,
      calories: foodData.calories,
      macros: `C: ${foodData.carbs}g, P: ${foodData.protein}g, F: ${foodData.fat}g`,
      vitamins: foodData.vitamins,
      sweeteners: foodData.sweeteners,
      caffeine: foodData.caffeine,
      date: new Date().toLocaleString()
    };
    const log = JSON.parse(localStorage.getItem('nutritionLog') || '[]');
    log.unshift(entry);
    localStorage.setItem('nutritionLog', JSON.stringify(log));
    foodInput.value = '';
    updateNutritionLog();
    updateNutritionChart();
    showNotification(`Added: ${foodData.name} (${foodData.calories} kcal)`, 'success');
  } else {
    // Fallback to mock data
    const mockData = {
      calories: Math.floor(Math.random() * 300) + 50,
      macros: 'C: 20g, P: 5g, F: 8g',
      vitamins: 'A, C, D',
      sweeteners: Math.random() > 0.7 ? 'Yes' : 'No',
      caffeine: Math.random() > 0.8 ? 80 : 0
    };
    const entry = {
      food,
      ...mockData,
      date: new Date().toLocaleString()
    };
    const log = JSON.parse(localStorage.getItem('nutritionLog') || '[]');
    log.unshift(entry);
    localStorage.setItem('nutritionLog', JSON.stringify(log));
    foodInput.value = '';
    updateNutritionLog();
    updateNutritionChart();
    showNotification('Food added (using estimated data)', 'success');
  }
}

function updateNutritionChart() {
  const log = JSON.parse(localStorage.getItem('nutritionLog') || '[]');
  const ctx = document.getElementById('nutrition-chart');
  
  if (nutritionChart) {
    nutritionChart.destroy();
  }

  if (log.length === 0) return;

  const last7Days = log.slice(0, 7);
  const labels = last7Days.map(entry => entry.food.substring(0, 15));
  const calories = last7Days.map(entry => entry.calories);

  nutritionChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Calories',
        data: calories,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Recent Food Intake (Calories)'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function updateNutritionLog() {
  const log = JSON.parse(localStorage.getItem('nutritionLog') || '[]');
  const list = document.getElementById('nutrition-log-list');
  let totalCalories = 0;
  let macros = [], vitamins = [], sweeteners = 0, caffeine = 0;
  list.innerHTML = '';
  log.forEach(entry => {
    totalCalories += entry.calories;
    macros.push(entry.macros);
    if (entry.vitamins) vitamins.push(entry.vitamins);
    if (entry.sweeteners === 'Yes') sweeteners++;
    caffeine += entry.caffeine;
    const li = document.createElement('li');
    li.innerHTML = `<b>${entry.food}</b> <span style='color:#888;'>${entry.date}</span> - <span>${entry.calories} kcal</span> <span>${entry.macros}</span> <span>Vit: ${entry.vitamins}</span> <span>${entry.caffeine ? entry.caffeine + 'mg caffeine' : ''}</span> <span>${entry.sweeteners === 'Yes' ? 'Sweetener' : ''}</span>`;
    list.appendChild(li);
  });
  document.getElementById('nutrition-calories').innerText = totalCalories;
  document.getElementById('nutrition-macros').innerText = macros.length ? macros[0] + (macros.length > 1 ? ' ...' : '') : '-';
  document.getElementById('nutrition-vitamins').innerText = vitamins.length ? vitamins[0] + (vitamins.length > 1 ? ' ...' : '') : '-';
  document.getElementById('nutrition-sweeteners').innerText = sweeteners;
  document.getElementById('nutrition-caffeine').innerText = caffeine;
}

// Social Sharing Features
function shareWorkout(workout) {
  const text = `Just completed a ${workout.activity} workout on FitSphere! 🏃‍♂️\nTime: ${workout.duration}\nCalories burned: ${workout.calories} kcal\nDistance: ${workout.distance} km`;
  
  if (navigator.share) {
    navigator.share({
      title: 'FitSphere Workout',
      text: text,
      url: window.location.href
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Workout details copied to clipboard!', 'success');
    });
  }
}

function shareNutrition() {
  const log = JSON.parse(localStorage.getItem('nutritionLog') || '[]');
  if (log.length === 0) {
    showNotification('No nutrition data to share', 'error');
    return;
  }
  
  const totalCalories = log.reduce((sum, entry) => sum + entry.calories, 0);
  const text = `My nutrition summary on FitSphere! 🍎\nTotal calories: ${totalCalories} kcal\nFoods logged: ${log.length}`;
  
  if (navigator.share) {
    navigator.share({
      title: 'FitSphere Nutrition',
      text: text,
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Nutrition summary copied to clipboard!', 'success');
    });
  }
}

// Enhanced Motivational Content
const motivationalQuotes = [
  "Every step is progress. Welcome to FitSphere!",
  "Push yourself, because no one else is going to do it for you.",
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Make yourself proud.",
  "Small progress is still progress.",
  "You are stronger than you think.",
  "The difference between try and triumph is just a little umph!",
  "Don't wish for it. Work for it.",
  "Success starts with self-discipline."
];

function updateMotivationalQuote() {
  const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  const motivationElement = document.getElementById('header-motivation');
  if (motivationElement) {
    motivationElement.innerText = quote;
  }
}

// Sleep tracking
function addSleepEntry() {
  const hours = parseFloat(document.getElementById('sleep-hours').value);
  const quality = document.getElementById('sleep-quality').value;
  if (!hours || hours < 0 || hours > 24) {
    showNotification('Please enter valid hours slept.', 'error');
    return;
  }
  if (!quality) {
    showNotification('Please select sleep quality.', 'error');
    return;
  }
  const entry = {
    hours,
    quality,
    date: new Date().toLocaleString()
  };
  const log = JSON.parse(localStorage.getItem('sleepLog') || '[]');
  log.unshift(entry);
  localStorage.setItem('sleepLog', JSON.stringify(log));
  document.getElementById('sleep-hours').value = '';
  document.getElementById('sleep-quality').value = '';
  updateSleepLog();
  showNotification('Sleep entry added!', 'success');
}

function updateSleepLog() {
  const log = JSON.parse(localStorage.getItem('sleepLog') || '[]');
  const list = document.getElementById('sleep-log-list');
  let total = 0;
  list.innerHTML = '';
  log.forEach(entry => {
    total += entry.hours;
    const li = document.createElement('li');
    li.innerHTML = `<b>${entry.hours}h</b> <span style='color:#888;'>${entry.date}</span> - <span>${entry.quality}</span>`;
    list.appendChild(li);
  });
  const avg = log.length ? (total / log.length).toFixed(2) : '-';
  document.getElementById('sleep-average').innerText = avg;
  document.getElementById('sleep-tip').innerText = getSleepTip(avg);
}

function getSleepTip(avg) {
  if (avg === '-') return 'Get 7-9 hours for optimal recovery!';
  if (avg >= 7 && avg <= 9) return 'Great job! You are getting optimal sleep.';
  if (avg < 7) return 'Try to get more sleep for better recovery.';
  return 'Too much sleep can also affect recovery.';
}

// Update nutrition log on tab switch
const origSwitchTab2 = switchTab;
switchTab = function(tab) {
  origSwitchTab2(tab);
  if (tab === 'nutrition') {
    updateNutritionLog();
    updateNutritionChart();
  }
  if (tab === 'sleep') updateSleepLog();
};

// Initialize everything
window.onload = () => {
  const savedUser = localStorage.getItem("username");
  const userInfo = localStorage.getItem("userInfo");
  if (savedUser && userInfo) {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
    document.getElementById("user-display").innerText = savedUser;
    loadHistory();
    updateStats();
    switchTab('home');
    updateLeaderboard();
    updateNutritionLog();
    updateSleepLog();
    updateMotivationalQuote();
  }
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      if (timer && !isPaused) {
        pauseWorkout();
      } else if (isPaused) {
        startWorkout();
      } else {
        startWorkout();
      }
    }
  });
};
