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

            const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&eventCode=${movieCode}&regionCode=${cityCode}&dateCode=${formattedDate}`;

            try {
                const response = await fetch(url);
                const data = await response.text();

                if (data.includes("<!DOCTYPE")) continue;

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
                const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);
                movieTotalShows = uniqueShows;

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
                        totalSeats: movieSeatsAvail + movieBookedTickets,
                        occupancy: movieOccupancyRate + '%',
                    });
                }
            } catch (error) {
                console.error(`Error fetching data for movie ${movieName} in city ${cityName}:`, error);
            }
        }
    }

    let finalSummaryTable = `<h3>Final Summary of Shows</h3><table class="final-summary-table">
        <thead>
            <tr>
                <th>City</th>
                <th>Movie</th>
                <th>Total Shows</th>
                <th>Collection (₹)</th>
                <th>Seats Available</th>
                <th>Booked Tickets</th>
                <th>Total Seats</th>
                <th>Occupancy Rate</th>
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
            <td>${row.totalSeats}</td>
            <td>${row.occupancy}</td>
        </tr>`;
    });
    const totalOccupancyRate = ((totalBookedTickets / (totalSeatsAvail + totalBookedTickets)) * 100).toFixed(2);
    const totalSeats = summaryData.reduce((sum, row) => sum + row.totalSeats, 0);

    finalSummaryTable += `<tr class="total-row">
        <td>All Above</td>
        <td>All Above</td>
        <td>${totalShows}</td>
        <td>₹${totalCollection.toFixed(2)}</td>
        <td>${totalSeatsAvail}</td>
        <td>${totalBookedTickets}</td>
        <td>${totalSeats}</td>
        <td>${totalOccupancyRate}%</td> <!-- Occupancy added here -->
    </tr>`;

    finalSummaryTable += `</tbody></table>`;

    tableContainer.innerHTML = allResults;
    summaryContainer.innerHTML = finalSummaryTable;

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
