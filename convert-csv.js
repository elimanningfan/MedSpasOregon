const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the CSV file
const csvData = fs.readFileSync('Med Spa Oregon 1_11 - Cleaned3 (1).csv', 'utf8');

// Parse CSV
const records = csv.parse(csvData, {
    columns: true,
    skip_empty_lines: true
});

// Convert records to our desired format
const medSpas = records.map(record => {
    // Parse working hours
    let workingHours;
    try {
        workingHours = JSON.parse(record.working_hours.replace(/'/g, '"'));
    } catch (e) {
        console.warn(`Warning: Could not parse working hours for ${record.name}`);
        workingHours = {};
    }

    // Create the med spa object
    return {
        name: record.name,
        rating: record.rating,
        reviews: record.reviews,
        location: `${record.city}, OR`,
        address: record.full_address || `${record.street}, ${record.city}, OR ${record.postal_code}`,
        phone: record.phone,
        website: record.site,
        photo: record.photo,
        services: record.subtypes || record.services,
        business_status: record.business_status || 'OPERATIONAL',
        working_hours: workingHours,
        reviews_per_score: {
            "5": parseInt(record.reviews_per_score_5) || 0,
            "4": parseInt(record.reviews_per_score_4) || 0,
            "3": parseInt(record.reviews_per_score_3) || 0,
            "2": parseInt(record.reviews_per_score_2) || 0,
            "1": parseInt(record.reviews_per_score_1) || 0
        },
        location_link: record.location_link
    };
});

// Write to data.js
const fileContent = `module.exports = ${JSON.stringify(medSpas, null, 2)};`;
fs.writeFileSync('data.js', fileContent);

console.log(`Converted ${medSpas.length} med spas to data.js`); 