var toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
var currentTheme = localStorage.getItem('theme');
var mainHeader = document.querySelector('.main-header');

if (currentTheme) {
  if (currentTheme === 'dark') {
    if (!document.body.classList.contains('dark-mode')) {
      document.body.classList.add("dark-mode");
    }
    toggleSwitch.checked = true;
  }
}

function switchTheme(e) {
  if (e.target.checked) {
    if (!document.body.classList.contains('dark-mode')) {
      document.body.classList.add("dark-mode");
    }
    localStorage.setItem('theme', 'dark');
  } else {
    if (document.body.classList.contains('dark-mode')) {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem('theme', 'light');
  }
}

toggleSwitch.addEventListener('change', switchTheme, false);