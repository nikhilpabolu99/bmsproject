// DOM Elements
const citySelect = document.getElementById('citySelect');
const movieSelect = document.getElementById('movieSelect');
const datePicker = document.getElementById('datePicker');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const resultsContainer = document.getElementById('resultsContainer');
const tableContainer = document.getElementById('tableContainer');
const summaryContainer = document.getElementById('summaryContainer');
const toggleTableBtn = document.getElementById('toggleTableBtn');

// Global Variables
let cityCode = "";
let movieCodes = [];  // Changed to an array to handle multiple movie selections
let formattedDate = "";

// Fetch showtimes and collections
const fetchShowtimes = async () => {
    cityCode = citySelect.value;
    movieCodes = movieSelect.value.split(","); // Assuming movie selections are comma-separated
    formattedDate = datePicker.value.replace(/-/g, "");

    if (!cityCode || movieCodes.length === 0 || !formattedDate) {
        alert("Please select all fields!");
        return;
    }

    // Variables for overall totals
    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;

    let allResults = "";

    for (let movieCode of movieCodes) {
        let movieResults = ""; // Store table rows for the current movie
        let movieCollection = 0;
        let movieSeatsAvail = 0;
        let movieBookedTickets = 0;

        const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            data.ShowDetails.forEach(showDetail => {
                showDetail.Venues.forEach(venue => {
                    venue.ShowTimes.forEach(showTime => {
                        showTime.Categories.forEach(category => {
                            const maxSeats = parseInt(category.MaxSeats, 10);
                            const seatsAvail = parseInt(category.SeatsAvail, 10);
                            const bookedTickets = maxSeats - seatsAvail;
                            const currentPrice = parseFloat(category.CurPrice);
                            const collection = bookedTickets * currentPrice;

                            // Update movie totals
                            movieCollection += collection;
                            movieSeatsAvail += seatsAvail;
                            movieBookedTickets += bookedTickets;

                            // Append row for current category
                            movieResults += `<tr>
                                <td>${venue.VenueName}</td>
                                <td>${showTime.ShowTime}</td>
                                <td>${category.PriceDesc}</td>
                                <td>${maxSeats}</td>
                                <td>${seatsAvail}</td>
                                <td>${bookedTickets}</td>
                                <td>₹${currentPrice.toFixed(2)}</td>
                                <td>₹${collection.toFixed(2)}</td>
                            </tr>`;
                        });
                    });
                });
            });

            // Build movie-specific table
            allResults += `<h2>Results for Movie: ${movieCode}</h2>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Venue</th>
                            <th>Show Time</th>
                            <th>Category</th>
                            <th>Max Seats</th>
                            <th>Seats Available</th>
                            <th>Booked Tickets</th>
                            <th>Current Price (₹)</th>
                            <th>Collection (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movieResults}
                    </tbody>
                </table>`;

            // Add movie summary
            allResults += `<div class="movie-summary">
                <h3>Summary for Movie: ${movieCode}</h3>
                <ul>
                    <li><strong>Movie Collection:</strong> ₹${movieCollection.toFixed(2)}</li>
                    <li><strong>Seats Available:</strong> ${movieSeatsAvail}</li>
                    <li><strong>Booked Tickets:</strong> ${movieBookedTickets}</li>
                </ul>
            </div>`;

            // Update overall totals
            totalCollection += movieCollection;
            totalSeatsAvail += movieSeatsAvail;
            totalBookedTickets += movieBookedTickets;

        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // Add overall summary
    const summaryResults = `<div class="total-summary">
        <h3>Total Summary</h3>
        <ul>
            <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
            <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
            <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
        </ul>
    </div>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = summaryResults;

    tableContainer.style.display = "block";
    toggleTableBtn.style.display = "inline-block";  // Make the button visible
    toggleTableBtn.textContent = "Minimize Table";  // Change the button text
};

// Event Listeners
fetchDataBtn.addEventListener("click", fetchShowtimes);
toggleTableBtn.addEventListener("click", () => {
    if (tableContainer.style.display === "block") {
        tableContainer.style.display = "none";
        toggleTableBtn.textContent = "Show Table";
    } else {
        tableContainer.style.display = "block";
        toggleTableBtn.textContent = "Minimize Table";
    }
});
