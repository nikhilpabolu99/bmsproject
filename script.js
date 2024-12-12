const citySelect = document.getElementById('citySelect');
const movieSelect = document.getElementById('movieSelect');
const datePicker = document.getElementById('datePicker');
const fetchDataBtn = document.getElementById('fetchDataBtn');
const resultsContainer = document.getElementById('resultsContainer');
const tableContainer = document.getElementById('tableContainer');
const summaryContainer = document.getElementById('summaryContainer');
const toggleTableBtn = document.getElementById('toggleTableBtn');

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
        const allCities = [...data.BookMyShow.TopCities, ...data.BookMyShow.OtherCities].sort((a, b) =>
            a.RegionName.localeCompare(b.RegionName)
        );

        citySelect.innerHTML = `<option value="" disabled selected>Select a city...</option>`;
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
        });
    } catch (error) {
        console.error("Error fetching city data:", error);
    }
};

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
        let allResults = `<table class="results-table"><thead><tr>
            <th>Venue</th><th>Show Time</th><th>Category</th>
            <th>Max Seats</th><th>Seats Available</th>
            <th>Booked Tickets</th><th>Current Price (₹)</th><th>Collection (₹)</th>
        </tr></thead><tbody>`;

        let totalCollection = 0;
        let totalSeatsAvail = 0;
        let totalBookedTickets = 0;

        data.ShowDetails.forEach(showDetail => {
            showDetail.Venues.forEach(venue => {
                venue.ShowTimes.forEach(showTime => {
                    showTime.Categories.forEach(category => {
                        const maxSeats = parseInt(category.MaxSeats, 10);
                        const seatsAvail = parseInt(category.SeatsAvail, 10);
                        const bookedTickets = maxSeats - seatsAvail;
                        const currentPrice = parseFloat(category.CurPrice);
                        const collection = bookedTickets * currentPrice;

                        totalCollection += collection;
                        totalSeatsAvail += seatsAvail;
                        totalBookedTickets += bookedTickets;

                        allResults += `<tr>
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

        allResults += `</tbody></table>`;
        
        const summaryResults = `
            <div class="total-summary">
                <h3>Total Summary</h3>
                <ul>
                    <li><strong>Total Collection:</strong> ₹${totalCollection.toFixed(2)}</li>
                    <li><strong>Total Seats Available:</strong> ${totalSeatsAvail}</li>
                    <li><strong>Total Booked Tickets:</strong> ${totalBookedTickets}</li>
                </ul>
            </div>
        `;

        tableContainer.innerHTML = allResults;
        summaryContainer.innerHTML = summaryResults;

        tableContainer.style.display = "block";
        toggleTableBtn.textContent = "Minimize Table";
    } catch (error) {
        console.error("Error fetching data:", error);
    }
};

fetchDataBtn.addEventListener("click", fetchShowtimes);

// Toggle table visibility
toggleTableBtn.addEventListener("click", () => {
    if (tableContainer.style.display === "none") {
        tableContainer.style.display = "block";
        toggleTableBtn.textContent = "Minimize Table";
    } else {
        tableContainer.style.display = "none";
        toggleTableBtn.textContent = "Show Table";
    }
});
