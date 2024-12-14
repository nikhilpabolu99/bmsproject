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
let formattedDate = "";
let allShowtimes = []; // Store all showtimes for filtering

// Initialize Choices.js for dropdowns
const initializeDropdown = (element) => {
    new Choices(element, {
        removeItemButton: true,
        placeholder: true,
        searchEnabled: true,
        itemSelectText: 'Click to select',
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
    // Get selected cities and movie codes
    const cityCodes = Array.from(citySelect.selectedOptions).map(opt => opt.value);
    const cityNames = Array.from(citySelect.selectedOptions).map(opt => opt.textContent);
    const movieCodes = movieChoices.getValue(true);
    const movieNames = movieCodes.map(code => {
        const option = Array.from(movieSelect.options).find(opt => opt.value === code);
        return option ? option.textContent : '';
    });

    formattedDate = datePicker.value.replace(/-/g, "");

    if (cityCodes.length === 0 || movieCodes.length === 0 || !formattedDate) {
        alert("Please select all fields!");
        return;
    }

    // Variables for overall totals
    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";
    let finalSummaryData = [];

    allShowtimes = []; // Reset showtimes for each fetch

    for (const [cityIndex, cityCode] of cityCodes.entries()) {
        const cityName = cityNames[cityIndex];
        for (let i = 0; i < movieCodes.length; i++) {
            const movieCode = movieCodes[i];
            const movieName = movieNames[i];
            let movieResults = "";
            let movieCollection = 0;
            let movieSeatsAvail = 0;
            let movieBookedTickets = 0;
            let movieTotalShows = 0;
            const venueShowtimeMap = {};

            const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;

            const headers = {
                "x-region-code": cityCode,
                "x-subregion-code": cityCode,
            };

            try {
                const response = await fetch(url, {
                    method: "GET",
                    headers: headers,
                });

                const data = await response.text();

                if (data.includes("<!DOCTYPE")) {
                    console.warn(`Invalid response for movie ${movieName} in city ${cityName}, skipping.`);
                    continue;
                }

                const jsonData = JSON.parse (data);

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
                                    <td>₹${currentPrice.toFixed(2)}</td>
                                    <td>₹${collection.toFixed(2)}</td>
                                </tr>`;

                                // Store showtime for filtering
                                allShowtimes.push({ showTime: showTime.ShowTime, venue: venue.VenueName, category: category.PriceDesc });
                            });
                        });
                    });
                });

                const uniqueShows = Object.keys(venueShowtimeMap).length;
                const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);
                movieTotalShows = uniqueShows;

                allResults += `<h2>Results for Movie: ${movieName} in City: ${cityName}</h2>
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

                totalSummaryDetails += `<div class="movie-summary">
                    <h4>Summary for Movie: ${movieName} in City: ${cityName}</h4>
                    <ul>
                        <li><strong>Movie Collection:</strong> ₹${movieCollection.toFixed(2)}</li>
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

                if (movieTotalShows > 0) {
                    finalSummaryData.push({
                        cityName: cityName,
                        movieName: movieName,
                        totalShows: movieTotalShows,
                        movieCollection: movieCollection.toFixed(2),
                        movieSeatsAvail: movieSeatsAvail,
                        movieBookedTickets: movieBookedTickets,
                    });
                }
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
            <li><strong>Total Shows:</strong> ${totalShows}</li>
            <li><strong>Overall Occupancy Rate:</strong> ${totalOccupancyRate}%</li>
        </ul>
    </div>`;

    let finalSummaryTable = `<h3>Final Summary of Shows</h3><table class="final-summary-table">
        <thead>
            <tr>
                <th>City</th>
                <th>Movie</th>
                <th>Total Shows</th>
                <th>Collection (₹)</th>
                <th>Seats Available</th>
                <th>Booked Tickets</th>
            </tr>
        </thead>
        <tbody>`;

    finalSummaryData.forEach((row) => {
        finalSummaryTable += `<tr>
            <td>${row.cityName}</td>
            <td>${row.movieName}</td>
            <td>${row.totalShows}</td>
            <td>₹${row.movieCollection}</td>
            <td>${row.movieSeatsAvail}</td>
            <td>${row.movieBookedTickets}</td>
        </tr>`;
    });

    finalSummaryTable += `<tr class="total-row">
        <td>All Above</td>
        <td>All Above</td>
        <td>${totalShows}</td>
        <td>₹${totalCollection.toFixed(2)}</td>
        <td>${totalSeatsAvail}</td>
        <td>${totalBookedTickets}</td>
    </tr>`;

    finalSummaryTable += `</tbody></table>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = totalSummary + totalSummaryDetails + finalSummaryTable;

    tableContainer.style.display = "block";
    summaryContainer.style.display = "block";
    toggleTableBtn.style.display = "inline-block";
    toggleTableBtn.textContent = "Minimize Table";

    // Create filter buttons
    createFilterButtons();
};

const createFilterButtons = () => {
    const filterContainer = document.createElement('div');
    filterContainer.id = 'filterButtons';
    filterContainer.innerHTML = `
        <button id="allBtn">All</button>
        <button id="emsBtn">EMS</button>
        <button id="noonShowsBtn">Noon Shows</button>
        <button id="matineeBtn">Matinee</button>
        <button id="firstShowsBtn">1st Shows</button>
        <button id="secondShowsBtn">2nd Shows</button>
    `;
    summaryContainer.appendChild(filterContainer);

    document.getElementById('allBtn').addEventListener('click', () => displayFilteredResults(allShowtimes));
    document.getElementById('emsBtn').addEventListener('click', () => displayFilteredResults(allShowtimes.filter(show => isTimeBetween(show.showTime, '00:00', '07:00'))));
    document.getElementById('noonShowsBtn').addEventListener('click', () => displayFilteredResults(allShowtimes.filter(show => isTimeBetween(show.showTime, '10:30', '11:59'))));
    document.getElementById('matineeBtn').addEventListener('click', () => displayFilteredResults(allShowtimes.filter(show => isTimeBetween(show.showTime, '12:00', '15:30'))));
    document.getElementById('firstShowsBtn').addEventListener('click', () => displayFilteredResults(allShowtimes.filter(show => isTimeBetween(show.showTime, '16:00', '19:59'))));
    document.getElementById('secondShowsBtn').addEventListener('click', () => displayFilteredResults(allShowtimes.filter(show => isTimeBetween(show.showTime, '20:00', '23:59'))));
};

const isTimeBetween = (showTime, startTime, endTime) => {
    const time = convertTo24Hour(showTime);
    return time >= convertTo24Hour(startTime) && time <= convertTo24Hour(endTime);
};

const convertTo24Hour = (time) => {
    const [hour, minute] = time.match(/(\d+)(am|pm)/i).slice(1, 3);
    let hour24 = parseInt(hour, 10);
    if (time.includes('pm') && hour24 < 12) hour24 += 12;
    if (time.includes('am') && hour24 === 12) hour24 = 0;
    return hour24 * 100 + parseInt(minute, 10);
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
