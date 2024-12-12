<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/choices.js/public/assets/styles/choices.min.css">
<script src="https://cdn.jsdelivr.net/npm/choices.js/public/assets/scripts/choices.min.js"></script>

// Initialize Choices.js for the movie select dropdown
const movieSelect = new Choices('#movieSelect', {
    removeItemButton: true,  // Allow removal of selected items
    maxItemCount: 5,         // Limit the number of selections (optional)
    searchEnabled: true,     // Enable search functionality in the dropdown
    placeholderValue: 'Select Movies',  // Placeholder text when no movie is selected
    itemSelectText: 'Click to select',  // Text when selecting an item
});

// Fetch selected movies when the button is clicked
document.getElementById('fetchDataBtn').addEventListener('click', () => {
    const selectedMovies = movieSelect.getValue(true); // Get selected movie values
    console.log('Selected Movies:', selectedMovies);
});
