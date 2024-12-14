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
const filterSelect = document.getElementById("filterSelect");

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

// Event listener for filter selection
filterSelect.addEventListener("change", (e) => {
    const selectedValue = e.target.value;
    currentFilter = selectedValue; // Update the current filter
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
    if (currentFilter === 'all') return true;
    if (currentFilter === 'ems') return checkShowtimeRange(showtime, '00:00', '07:00');
    if (currentFilter === 'noonshows') return checkShowtimeRange(showtime, '10:30', '11:59');
    if (currentFilter === 'matinee') return checkShowtimeRange(showtime, '12:00', '15:30');
    if (currentFilter === 'firstshows') return checkShowtimeRange(showtime, '16:00', '19:59');
    if (currentFilter === 'seconds shows') return checkShowtimeRange(showtime, '20:00', '23:59');
    return false;
};

// Function to fetch showtimes data and populate the results
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

    let allResults = "";
    let totalCollection = 0;
    let totalSeatsAvail = 0;
    let totalBookedTickets = 0;
    let totalShows = 0;

    // Loop through cities and movies to fetch data
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

            const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;

            try {
                const response = await fetch(url);
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

                                if (filterShowtimes(showTime.ShowTime)) {
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
                                }
                            });
                        });
                    });
                });

                const movieOccupancyRate = ((movieBookedTickets / (movieSeatsAvail + movieBookedTickets)) * 100).toFixed(2);
                movieTotalShows = movieResults.length > 0 ? movieResults.split('</tr>').length - 1 : 0;

                totalCollection += movieCollection;
                totalSeatsAvail += movieSeatsAvail;
                totalBookedTickets += movieBookedTickets;
                totalShows += movieTotalShows;

                allResults += `<h2>Results for Movie: ${movieName} in City: ${cityName}</h2>
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Venue</th>
                                <th>Showtime</th>
                                <th>Price</th>
                                <th>Max Seats</th>
                                <th>Seats Available</th>
                                <th>Seats Booked</th>
                                <th>Ticket Price</th>
                                <th>Total Collection</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movieResults}
                        </tbody>
                    </table>
                    <h3>Total Collection: ₹${movieCollection.toFixed(2)}</h3>
                    <h3>Total Seats Available: ${movieSeatsAvail}</h3>
                    <h3>Total Seats Booked: ${movieBookedTickets}</h3>
                    <h3>Occupancy Rate: ${movieOccupancyRate}%</h3>
                    <h3>Total Shows: ${movieTotalShows}</h3>`;
            } catch (error) {
                console.error(`Error fetching showtimes for movie ${movieName}:`, error);
            }
        }
    }

    summaryContainer.innerHTML = `
        <h3>Overall Summary:</h3>
        <table>
            <tr>
                <th>Total Collection</th>
                <td>₹${totalCollection.toFixed(2)}</td>
            </tr>
            <tr>
                <th>Total Seats Available</th>
                <td>${totalSeatsAvail}</td>
            </tr>
            <tr>
                <th>Total Seats Booked</th>
                <td>${totalBookedTickets}</td>
            </tr>
            <tr>
                <th>Total Shows</th>
                <td>${totalShows}</td>
            </tr>
        </table>
    `;
    resultsContainer.innerHTML = allResults;
};

// Toggle table visibility (keep your existing function intact)
const tbltoggle = () => {
    const table = document.querySelector("#tableContainer");
    table.classList.toggle("hidden");
};

// Event Listener for Fetch Data Button
fetchDataBtn.addEventListener("click", fetchShowtimes);
            
