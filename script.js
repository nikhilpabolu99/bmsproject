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
const filterSelect = document.getElementById("filterSelect");

// Global Variables
let formattedDate = "";
let currentFilter = 'all'; // Default filter set to 'all'

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

        //citySelect.innerHTML = "<option disabled selected>Select City</option>";
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

// Event listener for filter selection
filterSelect.addEventListener("change", (e) => {
    currentFilter = e.target.value; // Update the current filter
    fetchShowtimes(); // Trigger fetching showtimes again with the updated filter
});

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
        console.warn(`Invalid showtime: ${showtime}`);
        return false;
    }
    if (currentFilter === 'all') return true;
    if (currentFilter === 'ems') return checkShowtimeRange(showtime, '00:00', '07:00');
    if (currentFilter === 'noonshows') return checkShowtimeRange(showtime, '10:30', '11:59');
    if (currentFilter === 'matinee') return checkShowtimeRange(showtime, '12:00', '15:30');
    if (currentFilter === 'firstshows') return checkShowtimeRange(showtime, '16:00', '19:59');
    if (currentFilter === 'secondshows') return checkShowtimeRange(showtime, '20:00', '23:59');
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

    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;
    let allResults = "";
    let totalSummaryDetails = "";

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

            const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&dateCode=${formattedDate}`;

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (!data.ShowDetails) {
                    console.warn(`No show details for movie ${movieName} in city ${cityName}, skipping.`);
                    continue;
                }

                data.ShowDetails.forEach((showDetail) => {
                    showDetail.Venues.forEach((venue) => {
                        venue.ShowTimes.forEach((showTime) => {
                            showTime.Categories.forEach((category) => {
                                const maxSeats = parseInt(category.MaxSeats, 10);
                                const seatsAvail = parseInt(category.SeatsAvail, 10);
                                const bookedTickets = maxSeats - seatsAvail;
                                const currentPrice = parseFloat(category.CurPrice);
                                const collection = bookedTickets * currentPrice;

                                if (filterShowtimes(showTime.ShowTime)) {
                                    movieCollection += collection;
                                    movieSeatsAvail += seatsAvail;
                                    movieBookedTickets += bookedTickets;
                                    movieTotalShows++;

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
                                }
                            });
                        });
                    });
                });

                allResults += `<h2>Results for Movie: ${movieName} in City: ${cityName}</h2>
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Venue</th>
                                <th>Show Time</th>
                                <th>Category</th>
                                <th>Max Seats</th>
                                <th>Available Seats</th>
                                <th>Booked Tickets</th>
                                <th>Ticket Price</th>
                                <th>Collection</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movieResults || '<tr><td colspan="8">No results found for the selected filter.</td></tr>'}
                        </tbody>
                    </table>`;

                totalCollection += movieCollection;
                totalSeatsAvail += movieSeatsAvail;
                totalBookedTickets += movieBookedTickets;
                totalShows += movieTotalShows;

                totalSummaryDetails += `
                    <h3>Summary for Movie: ${movieName} in City: ${cityName}</h3>
                    <p>Total Collection: ₹${movieCollection.toFixed(2)}</p>
                    <p>Total Seats Available: ${movieSeatsAvail}</p>
                    <p>Total Booked Tickets: ${movieBookedTickets}</p>
                    <p>Total Shows: ${movieTotalShows}</p>`;
            } catch (error) {
                console.error(`Error fetching data for movie ${movieName} in city ${cityName}:`, error);
            }
        }
    }

    // Populate the results container
    resultsContainer.innerHTML = `
        <div class="results-content">
            ${allResults || '<p>No results available. Please try different filters or input.</p>'}
        </div>`;

    // Populate the summary container
    summaryContainer.innerHTML = `
        <div class="summary-content">
            <h2>Overall Summary</h2>
            <p>Total Collection: ₹${totalCollection.toFixed(2)}</p>
            <p>Total Seats Available: ${totalSeatsAvail}</p>
            <p>Total Booked Tickets: ${totalBookedTickets}</p>
            <p>Total Shows: ${totalShows}</p>
            ${totalSummaryDetails || ''}
        </div>`;
};

// Event listener for the fetch data button
fetchDataBtn.addEventListener("click", fetchShowtimes);

// Event listener to toggle the visibility of the results table
toggleTableBtn.addEventListener("click", () => {
    if (tableContainer.style.display === "none" || !tableContainer.style.display) {
        tableContainer.style.display = "block";
        toggleTableBtn.textContent = "Hide Table";
    } else {
        tableContainer.style.display = "none";
        toggleTableBtn.textContent = "Show Table";
    }
});

// Initialize the application
(() => {
    // Default setup or initialization tasks can go here
    console.log("Application Initialized");
})();
