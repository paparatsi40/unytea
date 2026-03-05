"use client";

export default function AuditoriumTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-4">🧪 SVG Position Test</h1>
        <p className="mb-4">You should see 2 separate circles: RED on left, BLUE on right</p>
        
        <div className="bg-white rounded-lg p-8 border">
          <svg
            viewBox="0 0 1300 600"
            className="w-full border border-gray-300"
            style={{ height: '500px' }}
          >
            {/* RED Circle - Position 1 */}
            <g transform="translate(200, 280)">
              <circle cx="0" cy="0" r="50" fill="red" opacity="0.7" />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="30"
                fontWeight="bold"
              >
                1
              </text>
              <text x="0" y="70" textAnchor="middle" fontSize="16" fill="black">
                RED (200, 280)
              </text>
            </g>

            {/* BLUE Circle - Position 2 */}
            <g transform="translate(450, 280)">
              <circle cx="0" cy="0" r="50" fill="blue" opacity="0.7" />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="30"
                fontWeight="bold"
              >
                2
              </text>
              <text x="0" y="70" textAnchor="middle" fontSize="16" fill="black">
                BLUE (450, 280)
              </text>
            </g>

            {/* Grid lines for reference */}
            <line x1="0" y1="280" x2="1300" y2="280" stroke="gray" strokeWidth="1" strokeDasharray="5,5" />
            <line x1="200" y1="0" x2="200" y2="600" stroke="gray" strokeWidth="1" strokeDasharray="5,5" />
            <line x1="450" y1="0" x2="450" y2="600" stroke="gray" strokeWidth="1" strokeDasharray="5,5" />
          </svg>
        </div>

        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="font-bold">Expected Result:</p>
          <p>🔴 RED circle at x=200</p>
          <p>🔵 BLUE circle at x=450</p>
          <p>Both at y=280</p>
          <p>250px apart horizontally</p>
        </div>
      </div>
    </div>
  );
}
