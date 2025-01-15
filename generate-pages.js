const fs = require('fs');
const path = require('path');

// Get the med spas data by reading and evaluating data.js
const dataFileContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
const medSpas = eval(dataFileContent.replace('const medSpas = ', ''));

// Add a check to ensure we have data
if (!Array.isArray(medSpas) || medSpas.length === 0) {
    console.error('No med spa data found or data is not in correct format');
    process.exit(1);
}

// Create spas directory if it doesn't exist
const spasDir = path.join(__dirname, 'spas');
if (!fs.existsSync(spasDir)) {
    fs.mkdirSync(spasDir);
}

// Read the template
const template = fs.readFileSync(path.join(__dirname, 'spas', 'spa-template.html'), 'utf8');

// Function to format hours into a table
function formatHoursTable(workingHours) {
    // If no hours provided, return a default message
    if (!workingHours) {
        return '<tr><td colspan="2">Hours not available</td></tr>';
    }
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    let tableHtml = '';
    
    days.forEach(day => {
        const hours = workingHours[day] || 'Closed';
        tableHtml += `
            <tr>
                <td>${day}</td>
                <td>${hours}</td>
            </tr>`;
    });
    
    return tableHtml;
}

// Function to format review breakdown
function formatReviewBreakdown(spa) {
    const totalReviews = parseInt(spa.reviews) || 0;
    
    const chartHtml = `
        <div class="review-chart-container">
            <div class="chart-section">
                <canvas id="review-chart"></canvas>
            </div>
        </div>
        <script>
            const ctx = document.getElementById('review-chart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
                    datasets: [{
                        data: [
                            ${parseInt(spa.reviews_per_score[5]) || 0},
                            ${parseInt(spa.reviews_per_score[4]) || 0},
                            ${parseInt(spa.reviews_per_score[3]) || 0},
                            ${parseInt(spa.reviews_per_score[2]) || 0},
                            ${parseInt(spa.reviews_per_score[1]) || 0}
                        ],
                        backgroundColor: [
                            '#22c55e',
                            '#84cc16',
                            '#eab308',
                            '#f97316',
                            '#ef4444'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                generateLabels: function(chart) {
                                    const data = chart.data;
                                    return data.labels.map((label, i) => ({
                                        text: label + ' (' + data.datasets[0].data[i] + ' reviews)',
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        index: i
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.raw + ' reviews';
                                }
                            }
                        }
                    },
                    elements: {
                        arc: {
                            borderWidth: 0
                        }
                    }
                }
            });
        </script>
    `;
    
    return chartHtml;
}

// Function to generate AI description
function generateSpaDescription(spa) {
    const services = spa.services || spa.subtypes || 'medical spa services';
    const rating = Number(spa.rating).toFixed(1);
    const reviews = parseInt(spa.reviews);
    const location = spa.location || spa.address.split(',')[1].trim();
    
    // Array of template strings for variety
    const templates = [
        `${spa.name} is a medical spa in ${location} specializing in ${services.toLowerCase()}. The facility has received ${reviews} reviews with an average rating of ${rating} stars. Patients can access a range of treatments and services in a professional medical setting.`,
        
        `Located in ${location}, ${spa.name} provides ${services.toLowerCase()}. The facility maintains a ${rating}-star rating based on feedback from ${reviews} client reviews, demonstrating its track record in delivering medical spa treatments.`,
        
        `${spa.name} operates as a medical spa facility in ${location}, offering ${services.toLowerCase()}. With ${reviews} client reviews and a ${rating}-star rating, the establishment has built a documented history of providing medical spa services to the ${location} community.`,
        
        `Established in ${location}, ${spa.name} is a medical facility focusing on ${services.toLowerCase()}. The spa has accumulated ${reviews} client reviews and maintains a ${rating}-star rating. The facility provides medical spa treatments in a clinical setting.`,
        
        `${spa.name} serves the ${location} area as a medical spa offering ${services.toLowerCase()}. Client feedback includes ${reviews} reviews with an aggregate ${rating}-star rating. The facility provides medical aesthetic services in a professional healthcare environment.`
    ];
    
    // Randomly select a template
    return templates[Math.floor(Math.random() * templates.length)];
}

// Generate pages for each spa
medSpas.forEach(spa => {
    let pageContent = template;
    
    // Replace placeholders with actual content
    const replacements = {
        '[SPA_NAME]': spa.name,
        '[RATING]': Number(spa.rating).toFixed(1),
        '[REVIEW_COUNT]': spa.reviews,
        '[FULL_ADDRESS]': spa.full_address || spa.address,
        '[ENCODED_ADDRESS]': encodeURIComponent(spa.full_address || spa.address),
        '[PHONE]': spa.phone,
        '[WEBSITE]': spa.site || spa.website,
        '[PHOTO_URL]': spa.photo || '../images/default-spa.jpg',
        '[SERVICES]': spa.subtypes || spa.services || 'Medical spa services',
        '[BUSINESS_STATUS]': spa.business_status || 'OPERATIONAL',
        '[HOURS_TABLE]': formatHoursTable(spa.working_hours),
        '[REVIEW_BREAKDOWN]': formatReviewBreakdown(spa),
        '[MAPS_LINK]': spa.location_link || `https://www.google.com/maps/search/${encodeURIComponent(spa.address)}`,
        '[AI_DESCRIPTION]': generateSpaDescription(spa)
    };
    
    // Safer replacement method
    for (const [key, value] of Object.entries(replacements)) {
        try {
            // Split the content into manageable chunks
            const chunks = pageContent.split(key);
            pageContent = chunks.join(value || '');
        } catch (e) {
            console.error(`Error replacing ${key} for ${spa.name}:`, e);
        }
    }
    
    // Write the file
    const fileName = spa.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.html';
    fs.writeFileSync(path.join(spasDir, fileName), pageContent);
}); 