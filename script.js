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
const corsProxy = "https://cors-anywhere.herokuapp.com/"; // CORS proxy

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
    const apiURL = `${corsProxy}https://in.bookmyshow.com/api/explore/v1/discover/regions`;
    try {
        const response = await fetch(apiURL, {
            method: "GET",
            mode: "cors",
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
        });
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

    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";
    let finalSummaryRows = "";

    for (const [cityIndex, cityCode] of cityCodes.entries()) {
        const cityName = cityNames[cityIndex];
        for (let i = 0; i < movieCodes.length; i++) {
            const movieCode = movieCodes[i];
            const movieName = movieNames[i];
            let movieResults = "";
            let movieCollection = 0;
            let movieSeatsAvail = 0;
            let movieBookedTickets = 0;
            const venueShowtimeMap = {};

            const url = `${corsProxy}https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;

            const headers = {
                "x-region-code": cityCode,
                "x-subregion-code": cityCode,
            };

            try {
                const response = await fetch(url, {
                    method: "GET",
                    mode: "cors",
                    headers: {
                        ...headers,
                        "Access-Control-Allow-Origin": "*",
                    },
                });

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
                            });
                        });
                    });
                });

                const uniqueShows = Object.keys(venueShowtimeMap).length;

                if (uniqueShows > 0) {
                    finalSummaryRows += `<tr>
                        <td>${movieName}</td>
                        <td>${cityName}</td>
                        <td>${movieCollection.toFixed(2)}</td>
                        <td>${movieSeatsAvail}</td>
                        <td>${movieBookedTickets}</td>
                        <td>${uniqueShows}</td>
                    </tr>`;
                }

                const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);

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

                totalCollection += movieCollection;
                totalSeatsAvail += movieSeatsAvail;
                totalBookedTickets += movieBookedTickets;
                totalShows += uniqueShows;
            } catch (error) {
                console.error(`Error fetching data for movie ${movieName} in city ${cityName}:`, error);
            }
        }
    }

    const totalSummary = `<div class="total-summary">
        <h3>Total Summary</h3>
        <ul>
            <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
            <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
            <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
            <li><strong>Total Shows:</strong> ${totalShows}</li>
        </ul>
    </div>`;

    const finalSummaryTable = `<table class="final-summary-table">
        <thead>
            <tr>
                <th>Movie</th>
                <th>City</th>
                <th>Total Collection (₹)</th>
                <th>Total Seats Available</th>
                <th>Total Booked Tickets</th>
                <th>Total Shows</th>
            </tr>
        </thead>
        <tbody>
            ${finalSummaryRows}
        </tbody>
    </table>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = totalSummary + finalSummaryTable;

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
