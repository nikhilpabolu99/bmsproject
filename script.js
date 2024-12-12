// DOM Elements
const citySelect = document.getElementById("citySelect");
const movieSelect = document.getElementById("movieSelect");
const datePicker = document.getElementById("datePicker");
const fetchDataBtn = document.getElementById("fetchDataBtn");
const resultsContainer = document.getElementById("resultsContainer");
const tableContainer = document.getElementById("tableContainer");
const summaryContainer = document.getElementById("summaryContainer");
const toggleTableBtn = document.getElementById("toggleTableBtn");

// Global Variables
let cityCode = "";
let movieCodes = []; // Array for multiple movie selections
let formattedDate = "";

// Initialize Choices.js for dropdowns
const initializeDropdown = (element) => {
    new Choices(element, {
        searchEnabled: true,
        itemSelectText: "",
        shouldSort: false,
    });
};

// Fetch and populate cities
const fetchCities = async () => {
    const apiURL = "https://in.bookmyshow.com/api/explore/v1/discover/regions";
    try {
        const response = await fetch(apiURL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const allCities = [...data.BookMyShow.TopCities, ...data.BookMyShow.OtherCities]
            .sort((a, b) => a.RegionName.localeCompare(b.RegionName));

        citySelect.innerHTML = `<option value="" disabled selected>Select a city...</option>`;
        allCities.forEach((city) => {
            const option = document.createElement("option");
            option.value = city.RegionCode;
            option.textContent = city.RegionName;
            citySelect.appendChild(option);
        });

        initializeDropdown(citySelect);
    } catch (error) {
        console.error("Error fetching city data:", error);
    }
};
citySelect.addEventListener('focus', fetchCities);

// Fetch showtimes and collections
const fetchShowtimes = async () => {
    cityCode = citySelect.value;
    movieCodes = Array.from(movieSelect.selectedOptions).map((option) => option.value);
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

    for (const movieCode of movieCodes) {
        let movieResults = "";
        let movieCollection = 0;
        let movieSeatsAvail = 0;
        let movieBookedTickets = 0;

        const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&eventCode=${movieCode}&regionCode=${cityCode}&dateCode=${formattedDate}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();

            data.ShowDetails.forEach((showDetail) => {
                showDetail.Venues.forEach((venue) => {
                    venue.ShowTimes.forEach((showTime) => {
                        showTime.Categories.forEach((category) => {
                            const maxSeats = parseInt(category.MaxSeats, 10);
                            const seatsAvail = parseInt(category.SeatsAvail, 10);
                            const bookedTickets = maxSeats - seatsAvail;
                            const currentPrice = parseFloat(category.CurPrice);
                            const collection = bookedTickets * currentPrice;

                            movieCollection += collection;
                            movieSeatsAvail += seatsAvail;
                            movieBookedTickets += bookedTickets;

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

            allResults += `<div class="movie-summary">
                <h3>Summary for Movie: ${movieCode}</h3>
                <ul>
                    <li><strong>Movie Collection:</strong> ₹${movieCollection.toFixed(2)}</li>
                    <li><strong>Seats Available:</strong> ${movieSeatsAvail}</li>
                    <li><strong>Booked Tickets:</strong> ${movieBookedTickets}</li>
                </ul>
            </div>`;

            totalCollection += movieCollection;
            totalSeatsAvail += movieSeatsAvail;
            totalBookedTickets += movieBookedTickets;

        } catch (error) {
            console.error(`Error fetching data for movie code ${movieCode}:`, error);
        }
    }

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
    toggleTableBtn.style.display = "inline-block";
    toggleTableBtn.textContent = "Minimize Table";
};

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
