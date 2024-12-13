// DOM Elements
const citySelect = document.getElementById("citySelect");
const movieSelect = document.getElementById("movieSelect");
const movieChoices = new Choices(movieSelect, {
    removeItemButton: true,
    placeholder: true,
    searchEnabled: true,
    itemSelectText: "Click to select",
});
const datePicker = document.getElementById("datePicker");
const fetchDataBtn = document.getElementById("fetchDataBtn");
const resultsContainer = document.getElementById("resultsContainer");
const tableContainer = document.getElementById("tableContainer");
const summaryContainer = document.getElementById("summaryContainer");
const toggleTableBtn = document.getElementById("toggleTableBtn");

// Global Variables
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
        const allCities = [...data.BookMyShow.TopCities, ...data.BookMyShow.OtherCities].sort((a, b) =>
            a.RegionName.localeCompare(b.RegionName)
        );

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

citySelect.addEventListener("focus", fetchCities);

// Fetch showtimes and collections
const fetchShowtimes = async () => {
    const cityCodes = Array.from(citySelect.selectedOptions).map((opt) => opt.value);
    const cityNames = Array.from(citySelect.selectedOptions).map((opt) => opt.textContent);
    const movieCodes = movieChoices.getValue(true);
    const movieNames = movieCodes.map((code) => {
        const option = Array.from(movieSelect.options).find((opt) => opt.value === code);
        return option ? option.textContent : "";
    });

    formattedDate = datePicker.value.replace(/-/g, "");

    if (cityCodes.length === 0 || movieCodes.length === 0 || !formattedDate) {
        alert("Please select all fields!");
        return;
    }

    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";
    let summaryTableRows = "";

    for (const [cityIndex, cityCode] of cityCodes.entries()) {
        const cityName = cityNames[cityIndex];
        for (let i = 0; i < movieCodes.length; i++) {
            const movieCode = movieCodes[i];
            const movieName = movieNames[i];
            let movieCollection = 0;
            let movieSeatsAvail = 0;
            let movieBookedTickets = 0;

            const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?...`;

            const headers = {
                "x-region-code": cityCode,
                "x-subregion-code": cityCode,
            };

            try {
                const response = await fetch(url, { method: "GET", headers });
                const data = await response.text();

                if (data.includes("<!DOCTYPE")) {
                    console.warn(`Invalid response for movie ${movieName} in city ${cityName}, skipping.`);
                    continue;
                }

                const jsonData = JSON.parse(data);

                jsonData.ShowDetails.forEach((showDetail) => {
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
                            });
                        });
                    });
                });

                const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);

                totalSummaryDetails += `<div class="movie-summary">
                    <h4>Summary for Movie: ${movieName} in City: ${cityName}</h4>
                    <ul>
                        <li><strong>Movie Collection:</strong> ₹${movieCollection.toFixed(2)}</li>
                        <li><strong>Seats Available:</strong> ${movieSeatsAvail}</li>
                        <li><strong>Booked Tickets:</strong> ${movieBookedTickets}</li>
                        <li><strong>Occupancy Rate:</strong> ${movieOccupancyRate}%</li>
                    </ul>
                </div>`;

                summaryTableRows += `<tr>
                    <td>${movieName}</td>
                    <td>${cityName}</td>
                    <td>₹${movieCollection.toFixed(2)}</td>
                    <td>${movieSeatsAvail}</td>
                    <td>${movieBookedTickets}</td>
                    <td>${movieOccupancyRate}%</td>
                </tr>`;

                totalCollection += movieCollection;
                totalSeatsAvail += movieSeatsAvail;
                totalBookedTickets += movieBookedTickets;
            } catch (error) {
                console.error(`Error fetching data for movie ${movieName} in city ${cityName}:`, error);
            }
        }
    }

    const totalOccupancyRate = ((totalBookedTickets / (totalSeatsAvail + totalBookedTickets)) * 100).toFixed(2);

    const totalSummary = `<div class="total-summary">
        <h3>Total Summary</h3>
        <ul>
            <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
            <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
            <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
            <li><strong>Overall Occupancy Rate:</strong> ${totalOccupancyRate}%</li>
        </ul>
    </div>`;

    const summaryTable = `<h3>Detailed Summary Table</h3>
        <table class="summary-table">
            <thead>
                <tr>
                    <th>Movie</th>
                    <th>City</th>
                    <th>Collection (₹)</th>
                    <th>Seats Available</th>
                    <th>Booked Tickets</th>
                    <th>Occupancy Rate</th>
                </tr>
            </thead>
            <tbody>
                ${summaryTableRows}
            </tbody>
        </table>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = totalSummary + totalSummaryDetails + summaryTable;

    tableContainer.style.display = "block";
    summaryContainer.style.display = "block";
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
