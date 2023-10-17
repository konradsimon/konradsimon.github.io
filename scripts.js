// Function to add a class for fading in sections when they come into view
function addFadeInAnimation() {
    const sections = document.querySelectorAll('section');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    });

    sections.forEach((section) => {
        observer.observe(section);
    });
}

// Function to toggle the navigation menu on mobile
function toggleMenu() {
    const nav = document.querySelector('nav ul');
    nav.classList.toggle('active');
}

// Add event listener for the mobile menu button
const mobileMenuButton = document.querySelector('#mobile-menu-button');
if (mobileMenuButton) {
    mobileMenuButton.addEventListener('click', toggleMenu);
}

// Call the function to add fade-in animation to sections
addFadeInAnimation();
