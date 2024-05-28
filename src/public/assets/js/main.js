document.addEventListener('DOMContentLoaded', function() {
    // Get the element you want to animate
    const element = document.querySelector('.dropdown-menu');
  
    // Add the slideOut class to trigger the animation
    element.classList.add('slideOut');
  
    // After a certain duration, remove the slideOut class to reset the animation
    setTimeout(() => {
      element.classList.remove('slideOut');
    }, 300); // Duration should match the animation duration (0.3s in this case)
  });
  

  document.addEventListener('DOMContentLoaded', function() {
    // Check if the current page URL is either "/login" or "/register"
    if (window.location.pathname === '/login' || window.location.pathname === '/register' ) {
      function autoScroll(element) {
        let scrollTop = element.scrollTop;
        let scrollHeight = element.scrollHeight;
        let clientHeight = element.clientHeight;
  
        if (scrollTop + clientHeight >= scrollHeight) {
          // Reached the bottom, scroll back to the top
          element.scrollTop = 0;
        } else {
          // Scroll down by 1 pixel
          element.scrollTop += 1;
        }
      }
  
      // Get the scrollable element
      const scrollableElement = document.getElementById('scrollable-content');
  
      // Call the autoScroll function periodically
      setInterval(function() {
        autoScroll(scrollableElement);
      }, 100);
    }
  });