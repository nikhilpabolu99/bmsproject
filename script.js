const citySelect = document.getElementById('citySelect');
const movieSelect = document.getElementById('movieSelect');
const datePicker = document.getElementById('datePicker');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const resultsContainer = document.getElementById('resultsContainer');

let cityCode = "";
let movieCode = "";
let formattedDate = "";

// Fetch and populate cities
const fetchCities = async () => {
    const apiURL = "https://in.bookmyshow.com/api/explore/v1/discover/regions";
    try {
        const response = await fetch(apiURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const topCities = data.BookMyShow.TopCities;
        const otherCities = data.BookMyShow.OtherCities;

        // Combine and sort cities alphabetically
        const allCities = [...topCities, ...otherCities].sort((a, b) =>
            a.RegionName.localeCompare(b.RegionName)
        );

        // Clear existing options and populate new options dynamically
        citySelect.innerHTML = `<option value="" disabled selected>Select a city...</option>`; // Reset
        allCities.forEach((city) => {
            const option = document.createElement("option");
            option.value = city.RegionCode;
            option.textContent = city.RegionName;
            citySelect.appendChild(option);
        });

        new Choices(citySelect, {
            searchEnabled: true,
            itemSelectText: "",
            shouldSort: false,
            placeholderValue: "Search for a city...",
        });
    } catch (error) {
        console.error("Error fetching city data:", error);
    }
};

// Trigger city fetching when city dropdown is clicked
citySelect.addEventListener('focus', fetchCities);

// Fetch showtimes and collections
const fetchShowtimes = async () => {
    cityCode = citySelect.value;
    movieCode = movieSelect.value;
    formattedDate = datePicker.value.replace(/-/g, "");

    if (!cityCode || !movieCode || !formattedDate) {
        alert("Please select all fields!");
        return;
    }

    const url = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?appCode=MOBAND2&appVersion=14304&language=en&eventCode=${movieCode}&regionCode=${cityCode}&subRegion=${cityCode}&bmsId=1.21345445.1703250084656&token=67x1xa33b4x422b361ba&lat=12.971599&lon=77.59457&dateCode=${formattedDate}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let allResults = "";
        let totalCollection = 0;
        let totalSeatsAvail = 0;
        let totalBookedTickets = 0;
        let totalCurrentPrice = 0;

        // Generate table headers
        allResults += `
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
        `;

        data.ShowDetails.forEach(showDetail => {
            showDetail.Venues.forEach(venue => {
                venue.ShowTimes.forEach(showTime => {
                    showTime.Categories.forEach(category => {
                        const maxSeats = parseInt(category.MaxSeats, 10);
                        const seatsAvail = parseInt(category.SeatsAvail, 10);
                        const bookedTickets = maxSeats - seatsAvail;
                        const currentPrice = parseFloat(category.CurPrice);
                        const collection = bookedTickets * currentPrice;

                        // Append row to the table
                        allResults += `
                            <tr>
                                <td>${venue.VenueName}</td>
                                <td>${showTime.ShowTime}</td>
                                <td>${category.PriceDesc}</td>
                                <td>${maxSeats}</td>
                                <td>${seatsAvail}</td>
                                <td>${bookedTickets}</td>
                                <td>₹${currentPrice.toFixed(2)}</td>
                                <td>₹${collection.toFixed(2)}</td>
                            </tr>
                        `;

                        // Adding to totals
                        totalCollection += collection;
                        totalSeatsAvail += seatsAvail;
                        totalBookedTickets += bookedTickets;
                        totalCurrentPrice += currentPrice;
                    });
                });
            });
        });

        // Close the table
        allResults += `
                </tbody>
            </table>
        `;

        // Add summary box with totals
        allResults += `
            <div class="total-summary">
                <h3>Total Summary</h3>
                <ul>
                    <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
                    <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
                    <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
                    <li><strong>Total Current Price:</strong> ₹${totalCurrentPrice.toFixed(2)}</li>
                </ul>
            </div>
        `;

        resultsContainer.innerHTML = allResults;
    } catch (error) {
        console.error("Error fetching data:", error);
        resultsContainer.innerHTML = '<p>Failed to fetch data. Please try again later.</p>';
    }
};

fetchDataBtn.addEventListener("click", fetchShowtimes);
