// DOM Elements
const citySelect = document.getElementById("citySelect");
const movieSelect = document.getElementById("movieSelect");
const movieChoices = new Choices(movieSelect, {
    removeItemButton: true,
    placeholder: true,
    searchEnabled: true,
    itemSelectText: 'Click to select',
});
const datePicker = document.getElementById("datePicker");
const fetchDataBtn = document.getElementById("fetchDataBtn");
const resultsContainer = document.getElementById("resultsContainer");
const tableContainer = document.getElementById("tableContainer");
const summaryContainer = document.getElementById("summaryContainer");
const toggleTableBtn = document.getElementById("toggleTableBtn");

// Global Variables
let cityCode = "";
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

citySelect.addEventListener("focus", fetchCities);

// Fetch showtimes and collections
const fetchShowtimes = async () => {
    cityCode = citySelect.value;
    const movieCodes = movieChoices.getValue(true);  // Array of selected movie values (codes)
    const movieNames = movieCodes.map(code => {
        const option = Array.from(movieSelect.options).find(opt => opt.value === code);
        return option ? option.textContent : '';
    });

    formattedDate = datePicker.value.replace(/-/g, "");

    if (!cityCode || movieCodes.length === 0 || !formattedDate) {
        alert("Please select all fields!");
        return;
    }

    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";

    for (let i = 0; i < movieCodes.length; i++) {
        const movieCode = movieCodes[i];
        const movieName = movieNames[i];
        let movieResults = "";
        let movieCollection = 0;
        let movieSeatsAvail = 0;
        let movieBookedTickets = 0;
        const venueShowtimeMap = {};

        const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;
        const headers = { "x-region-code": cityCode, "x-subregion-code": cityCode };

        try {
            const response = await fetch(url, { method: "GET", headers: headers });
            const data = await response.text();

            if (data.includes("<!DOCTYPE")) {
                console.warn(`Invalid response for movie ${movieName}, skipping.`);
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

                            const showKey = `${venue.VenueName}-${showTime.ShowTime}`;
                            venueShowtimeMap[showKey] = (venueShowtimeMap[showKey] || 0) + 1;

                            movieResults += `<tr>
                                <td>${venue.VenueName}</td>
                                <td>${showTime.ShowTime}</td>
                                <td>${category.PriceDesc}</td>
                                <td>${maxSeats}</td>
                                <td>${seatsAvail}</td>
                                <td>${bookedTickets}</td>
                                <td>â‚¹${currentPrice.toFixed(2)}</td>
                                <td>â‚¹${collection.toFixed(2)}</td>
                                <td>${movieName}</td>
                            </tr>`;
                        });
                    });
                });
            });

            const uniqueShows = Object.keys(venueShowtimeMap).length;
            const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);

            allResults += `<h2>Results for Movie: ${movieName}</h2>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Venue</th>
                            <th>Show Time</th>
                            <th>Category</th>
                            <th>Max Seats</th>
                            <th>Seats Available</th>
                            <th>Booked Tickets</th>
                            <th>Current Price (â‚¹)</th>
                            <th>Collection (â‚¹)</th>
                            <th>Movie Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${movieResults}
                    </tbody>
                </table>`;

            totalSummaryDetails += `<div class="movie-summary">
                <h4>Summary for Movie: ${movieName}</h4>
                <ul>
                    <li><strong>Movie Collection:</strong> â‚¹${movieCollection.toFixed(2)}</li>
                    <li><strong>Seats Available:</strong> ${movieSeatsAvail}</li>
                    <li><strong>Booked Tickets:</strong> ${movieBookedTickets}</li>
                    <li><strong>Total Shows:</strong> ${uniqueShows}</li>
                    <li><strong>Occupancy Rate:</strong> ${movieOccupancyRate}%</li>
                </ul>
            </div>`;

            totalCollection += movieCollection;
            totalSeatsAvail += movieSeatsAvail;
            totalBookedTickets += movieBookedTickets;
            totalShows += uniqueShows;
        } catch (error) {
            console.error(`Error fetching data for movie ${movieName}:`, error);
        }
    }

    const totalOccupancyRate = ((totalBookedTickets / (totalSeatsAvail + totalBookedTickets)) * 100).toFixed(2);

    const totalSummary = `<div class="total-summary">
        <h3>Total Summary</h3>
        <ul>
            <li><strong>Total Collection:</strong> â‚¹${totalCollection.toFixed(2)}</li>
            <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
            <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
            <li><strong>Total Shows:</strong> ${totalShows}</li>
            <li><strong>Overall Occupancy Rate:</strong> ${totalOccupancyRate}%</li>
        </ul>
    </div>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = totalSummary + totalSummaryDetails;

    tableContainer.style.display = "block";
    summaryContainer.style.display = "block";
    toggleTableBtn.style.display = "inline-block";
    toggleTableBtn.textContent = "Minimize Table";

    // Add time filter buttons
    const timeFilterBtns = `
        <div class="time-filters">
            <button class="filter-btn" onclick="filterShows('1am-5am')">EMS (1am - 5am)</button>
            <button class="filter-btn" onclick="filterShows('6am-7am')">6am Shows</button>
            <button class="filter-btn" onclick="filterShows('noon')">Noon Shows</button>
            <button class="filter-btn" onclick="filterShows('matinee')">Matinee Shows</button>
            <button class="filter-btn" onclick="filterShows('1show')">1 Show (4pm - 7:59pm)</button>
            <button class="filter-btn" onclick="filterShows('2ndshow')">2nd Show (8pm - 11:59pm)</button>
        </div>
    `;
    tableContainer.insertAdjacentHTML('beforeend', timeFilterBtns);
};

// Showtime filtering function
const filterShows = (filterType) => {
    const rows = document.querySelectorAll('.results-table tbody tr');
    rows.forEach((row) => {
        const showTimeCell = row.cells[1].textContent.trim().toLowerCase(); // normalize time format
        const filteredRow = row;

        // Function to parse time string like '2am' or '2pm'
        const parseTime = (timeStr) => {
            const timeMatch = timeStr.match(/(\d{1,2})(am|pm)/);
            if (timeMatch) {
                let [_, hour, period] = timeMatch;
                hour = parseInt(hour, 10);
                if (period === 'pm' && hour !== 12) {
                    hour += 12; // Convert PM times to 24-hour format
                } else if (period === 'am' && hour === 12) {
                    hour = 0; // Convert 12am to 00:00 in 24-hour format
                }
                return hour;
            }
            return null; // Return null if format doesn't match
        };

        const showHour = parseTime(showTimeCell);
        if (showHour === null) {
            filteredRow.style.display = 'none'; // invalid time format, hide row
            return;
        }

        if (filterType === '1am-5am' && showHour >= 1 && showHour <= 5) {
            filteredRow.style.display = '';
        } else if (filterType === '6am-7am' && showHour >= 6 && showHour <= 7) {
            filteredRow.style.display = '';
        } else if (filterType === 'noon' && showHour >= 10 && showHour <= 11) {
            filteredRow.style.display = '';
        } else if (filterType === 'matinee' && showHour >= 12 && showHour <= 15) {
            filteredRow.style.display = '';
        } else if (filterType === '1show' && showHour >= 16 && showHour <= 19) {
            filteredRow.style.display = '';
        } else if (filterType === '2ndshow' && showHour >= 20 && showHour <= 23) {
            filteredRow.style.display = '';
        } else {
            filteredRow.style.display = 'none';
        }
    });
};


// Utility function to check if a time is within the given range
const isInTimeRange = (time, start, end) => {
    const timeParts = time.split(':');
    const startParts = start.split(':');
    const endParts = end.split(':');

    const timeMinutes = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

fetchDataBtn.addEventListener("click", fetchShowtimes);

toggleTableBtn.addEventListener("click", () => {
    if (tableContainer.style.display === "none") {
        tableContainer.style.display = "block";
        toggleTableBtn.textContent = "Minimize Table";
    } else {
        tableContainer.style.display = "none";
        toggleTableBtn.textContent = "Show Table";
    }
});
