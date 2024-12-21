// DOM Elements
const citySelect = document.getElementById("citySelect");
const movieSelect = document.getElementById("movieSelect");
const filterSelect = document.getElementById("filterSelect"); // New filter dropdown
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
let allShowtimesData = []; // Store all showtimes data
let currentFilter = 'all'; // Default filter

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

// Helper function to convert AM/PM time to 24-hour format
const convertTo24HourFormat = (time) => {
    const [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours);
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

// Helper function to check if the showtime is within a specific time range
const checkShowtimeRange = (showtime, start, end) => {
    const showtimeIn24Hr = convertTo24HourFormat(showtime);
    const [showtimeHours, showtimeMinutes] = showtimeIn24Hr.split(':');
    const showtimeInMinutes = parseInt(showtimeHours) * 60 + parseInt(showtimeMinutes);

    const [startHours, startMinutes] = start.split(':');
    const startInMinutes = parseInt(startHours) * 60 + parseInt(startMinutes);

    const [endHours, endMinutes] = end.split(':');
    const endInMinutes = parseInt(endHours) * 60 + parseInt(endMinutes);

    return showtimeInMinutes >= startInMinutes && showtimeInMinutes <= endInMinutes;
};

// Function to filter showtimes based on the selected filter
const filterShowtimes = (showtime) => {
    if (!showtime || typeof showtime !== 'string') {
        console.warn(`Invalid showtime: ${ showtime}`);
        return false;
    }
    if (currentFilter === 'all') return true;
    if (currentFilter === 'ems') return checkShowtimeRange(showtime, '00:00', '07:00');
    if (currentFilter === 'noonshows') return checkShowtimeRange(showtime, '10:30', '11:59');
    if (currentFilter === 'matinee') return checkShowtimeRange(showtime, '12:00', '15:30');
    if (currentFilter === 'firstshows') return checkShowtimeRange(showtime, '16:00', '19:59');
    if (currentFilter === 'seconds shows') return checkShowtimeRange(showtime, '20:00', '23:59');
    return false;
};

// Fetch showtimes and collections
const fetchShowtimes = async () => {
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

    // Disable the fetch button
    fetchDataBtn.disabled = true;

    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";
    let finalSummaryData = [];

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

                const jsonData = JSON.parse(data);
                allShowtimesData = []; // Reset the showtimes data for filtering

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

                                // Store showtime data for filtering
                                allShowtimesData.push({
                                    venue: venue.VenueName,
                                    showTime: showTime.ShowTime,
                                    category: category.PriceDesc,
                                    maxSeats: maxSeats,
                                    seatsAvail: seatsAvail,
                                    bookedTickets: bookedTickets,
                                    currentPrice: currentPrice,
                                    collection: collection,
                                });

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
                        totalseats: movieSeatsAvail + movieBookedTickets,
                        occupancy: movieOccupancyRate + '%',
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
            <li><strong>Total Seats:</strong> ${totalSeatsAvail + totalBookedTickets}</li>
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
                <th>Total Occupancy</th>
                <th>Total Seats</th>
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
            <td>${row.occupancy}</td>
            <td>${row.totalseats}</td>
        </tr>`;
    });

    const totalSeats = totalSeatsAvail + totalBookedTickets;

    finalSummaryTable += `<tr class="total-row">
        <td>All Above</td>
        <td>All Above</td>
        <td>${totalShows}</td>
        <td>₹${totalCollection.toFixed(2)}</td>
        <td>${totalSeatsAvail}</td>
        <td>${totalBookedTickets}</td>
        <td>${totalOccupancyRate}%</td>
        <td>${totalSeats}</td>
    </tr>`;

    finalSummaryTable += `</tbody></table>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = totalSummary + totalSummaryDetails + finalSummaryTable;

    tableContainer.style.display = "block";
    summaryContainer.style.display = "block";
    toggleTableBtn.style.display = "inline-block";
    toggleTableBtn.textContent = "Minimize Table";

    // Enable the filter button after fetching data
    fetchDataBtn.disabled = false;
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

// Event listener for filter selection
filterSelect.addEventListener("change", (e) => {
    const selectedValue = e.target.value;
    currentFilter = selectedValue; // Update the current filter
    applyFilter(); // Apply the filter to the existing data
});

// Function to apply the filter to the showtimes
const applyFilter = () => {
    const filteredResults = allShowtimesData.filter(showtime => filterShowtimes(showtime.showTime));
    
    // Update the results table
    const filteredTableRows = filteredResults.map(showtime => `
        <tr>
            <td>${showtime.venue}</td>
            <td>${showtime.showTime}</td>
            <td>${showtime.category}</td>
            <td>${showtime.maxSeats}</td>
            <td>${showtime.seatsAvail}</td>
            <td>${showtime.bookedTickets}</td>
            <td>₹${showtime.currentPrice.toFixed(2)}</td>
            <td>₹${showtime.collection.toFixed(2)}</td>
        </tr>
    `).join('');

    // Update the table with filtered results
    const resultsTable = document.querySelector('.results-table tbody');
    resultsTable.innerHTML = filteredTableRows;

    // Recalculate totals based on filtered results
    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = filteredResults.length;

    filteredResults.forEach(showtime => {
        totalCollection += showtime.collection;
        totalSeatsAvail += showtime.seatsAvail;
        totalBookedTickets += showtime.bookedTickets;
    });

    const totalOccupancyRate = totalBookedTickets + totalSeatsAvail > 0 
        ? ((totalBookedTickets / (totalSeatsAvail + totalBookedTickets)) * 100).toFixed(2) 
        : 0;

    // Update the total summary block
    const totalSummary = `<div class="total-summary">
        <h3>Total Summary</h3>
        <ul>
            <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
            <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
            <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
            <li><strong>Total Shows:</strong> ${totalShows}</li>
            <li><strong>Overall Occupancy Rate:</strong> ${totalOccupancyRate}%</li>
            <li><strong>Total Seats:</strong> ${totalSeatsAvail + totalBookedTickets}</li>
        </ul>
    </div>`;

    // Update the final summary table
    let finalSummaryTable = `<h3>Final Summary of Shows</h3><table class="final-summary-table">
        <thead>
            <tr>
                <th>City</th>
                <th>Movie</th>
                <th>Total Shows</th>
                <th>Collection (₹)</th>
                <th>Seats Available</th>
                <th>Booked Tickets</th>
                <th>Total Occupancy</th>
                <th>Total Seats</th>
            </tr>
        </thead>
        <tbody>`;

    const uniqueCities = [...new Set(filteredResults.map(showtime => showtime.city))];
    uniqueCities.forEach(city => {
        const cityResults = filteredResults.filter(showtime => showtime.city === city);
        const cityTotalCollection = cityResults.reduce((sum, showtime) => sum + showtime.collection, 0);
        const cityTotalSeatsAvail = cityResults.reduce((sum, showtime) => sum + showtime.seatsAvail, 0);
        const cityTotalBookedTickets = cityResults.reduce((sum, showtime) => sum + showtime.bookedTickets, 0);
        const cityTotalShows = cityResults.length;
        const cityOccupancyRate = cityTotalBookedTickets + cityTotalSeatsAvail > 0 
            ? ((cityTotalBookedTickets / (cityTotalSeatsAvail + cityTotalBookedTickets)) * 100).toFixed(2) 
            : 0;

        finalSummaryTable += `<tr>
            <td>${city}</td>
            <td>${cityResults[0].movie}</td>
            <td>${cityTotalShows}</td>
            <td>₹${cityTotalCollection.toFixed(2)}</td>
            <td>${cityTotalSeatsAvail}</td>
            <td>${cityTotalBookedTickets}</td>
            <td>${cityOccupancyRate}%</td>
            <td>${cityTotalSeatsAvail + cityTotalBookedTickets}</td>
        </tr>`;
    });

    finalSummaryTable += `</tbody></table>`;

    // Update the summary container with new totals
    summaryContainer.innerHTML = totalSummary + finalSummaryTable;
};

// Initialize the dropdowns
initializeDropdown(filterSelect);
fetchCities();
