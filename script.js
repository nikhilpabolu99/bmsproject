const citySelect = document.getElementById('citySelect');

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

        // Print all cities in a single array
        console.log("All Cities:", allCities);

        // Populate the city dropdown
        allCities.forEach((city) => {
            const option = document.createElement("option");
            option.value = city.RegionCode; // Use RegionCode as the value
            option.textContent = city.RegionName; // Use RegionName as display text
            citySelect.appendChild(option);
        });

        // Initialize Choices.js on the dropdown
        new Choices(citySelect, {
            searchEnabled: true, // Enable search
            itemSelectText: "", // Hide "Press to select" text
            shouldSort: false, // Keep options in their original order
            placeholderValue: "Search for a city...", // Optional: Add placeholder text
        });

        console.log("City dropdown populated successfully!");
    } catch (error) {
        console.error("Error fetching city data:", error);
    }
};

fetchCities();
