const fetchCities = async () => {
    const apiURL = "https://in.bookmyshow.com/api/explore/v1/discover/regions";

    try {
        // Fetch city data
        const response = await fetch(apiURL);

        // Check for HTTP errors
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse the response JSON
        const data = await response.json();

        // Safeguard checks for the structure of the data
        if (!data.BookMyShow || !data.BookMyShow.TopCities || !data.BookMyShow.OtherCities) {
            throw new Error("Unexpected data structure from API.");
        }

        const topCities = data.BookMyShow.TopCities;
        const otherCities = data.BookMyShow.OtherCities;

        // Combine and sort cities alphabetically
        const allCities = [...topCities, ...otherCities].sort((a, b) =>
            a.RegionName.localeCompare(b.RegionName)
        );

        console.log("All Cities:", allCities);

        // Select the dropdown element (ensure it exists in your HTML)
        const citySelect = document.getElementById("citySelect");
        if (!citySelect) {
            throw new Error("Dropdown element with ID 'citySelect' not found.");
        }

        // Populate the city dropdown
        allCities.forEach((city) => {
            const option = document.createElement("option");
            option.value = city.RegionCode; // Use RegionCode as the value
            option.textContent = city.RegionName; // Use RegionName as display text
            citySelect.appendChild(option);
        });

        console.log("City dropdown populated successfully!");
    } catch (error) {
        console.error("Error fetching city data:", error.message);
    }
};

// Call the function
fetchCities();
