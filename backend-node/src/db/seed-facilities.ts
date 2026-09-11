/**
 * Seed the facilities table with major Indian industrial facilities.
 * Run once: npx ts-node src/db/seed-facilities.ts
 */
import { db } from './postgres';
import { randomUUID } from 'crypto';

const facilities = [
  // ─── REFINERIES ──────────────────────────────────────────────────────────
  { name: 'Jamnagar Refinery (Reliance)', type: 'refinery', latitude: 22.4707, longitude: 70.0577, city: 'Jamnagar', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'Barauni Refinery (IOC)', type: 'refinery', latitude: 25.4747, longitude: 85.9819, city: 'Barauni', state: 'Bihar', country: 'India', source: 'openstreetmap' },
  { name: 'Panipat Refinery (IOC)', type: 'refinery', latitude: 29.3909, longitude: 76.8793, city: 'Panipat', state: 'Haryana', country: 'India', source: 'openstreetmap' },
  { name: 'Mathura Refinery (IOC)', type: 'refinery', latitude: 27.4924, longitude: 77.6788, city: 'Mathura', state: 'Uttar Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Bongaigaon Refinery (IOC)', type: 'refinery', latitude: 26.4839, longitude: 90.5585, city: 'Bongaigaon', state: 'Assam', country: 'India', source: 'openstreetmap' },
  { name: 'Digboi Refinery (IOC)', type: 'refinery', latitude: 27.3888, longitude: 95.6200, city: 'Digboi', state: 'Assam', country: 'India', source: 'openstreetmap' },
  { name: 'Guwahati Refinery (IOC)', type: 'refinery', latitude: 26.1830, longitude: 91.7460, city: 'Guwahati', state: 'Assam', country: 'India', source: 'openstreetmap' },
  { name: 'Haldia Refinery (IOC)', type: 'refinery', latitude: 22.0667, longitude: 88.0700, city: 'Haldia', state: 'West Bengal', country: 'India', source: 'openstreetmap' },
  { name: 'Koyali Refinery (IOC)', type: 'refinery', latitude: 22.4280, longitude: 72.9949, city: 'Vadodara', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'Mumbai Refinery (BPCL)', type: 'refinery', latitude: 19.0175, longitude: 72.9184, city: 'Mumbai', state: 'Maharashtra', country: 'India', source: 'openstreetmap' },
  { name: 'Kochi Refinery (BPCL)', type: 'refinery', latitude: 9.9312, longitude: 76.2673, city: 'Kochi', state: 'Kerala', country: 'India', source: 'openstreetmap' },
  { name: 'Chennai Refinery (CPCL)', type: 'refinery', latitude: 13.1437, longitude: 80.2961, city: 'Chennai', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Vizag Refinery (HPCL)', type: 'refinery', latitude: 17.7040, longitude: 83.2843, city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Mumbai Refinery (HPCL)', type: 'refinery', latitude: 19.0596, longitude: 72.8656, city: 'Mumbai', state: 'Maharashtra', country: 'India', source: 'openstreetmap' },
  { name: 'Numaligarh Refinery (NRL)', type: 'refinery', latitude: 26.6689, longitude: 93.6785, city: 'Numaligarh', state: 'Assam', country: 'India', source: 'openstreetmap' },
  { name: 'Tatipaka Refinery (ONGC)', type: 'refinery', latitude: 16.4929, longitude: 81.8048, city: 'Tatipaka', state: 'Andhra Pradesh', country: 'India', source: 'openstreetmap' },

  // ─── POWER PLANTS ─────────────────────────────────────────────────────────
  { name: 'Vindhyachal STPS (NTPC)', type: 'power_plant', latitude: 24.1177, longitude: 82.6609, city: 'Singrauli', state: 'Madhya Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Mundra UMPP (Adani)', type: 'power_plant', latitude: 22.8400, longitude: 69.7200, city: 'Mundra', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'Tiroda Power Plant (Adani)', type: 'power_plant', latitude: 21.4095, longitude: 79.8835, city: 'Tiroda', state: 'Maharashtra', country: 'India', source: 'openstreetmap' },
  { name: 'Rihand STPS (NTPC)', type: 'power_plant', latitude: 24.0495, longitude: 83.0009, city: 'Sonbhadra', state: 'Uttar Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'RAPS Nuclear (DAE)', type: 'power_plant', latitude: 24.8795, longitude: 75.5875, city: 'Rawatbhata', state: 'Rajasthan', country: 'India', source: 'openstreetmap' },
  { name: 'Kudankulam Nuclear (NPCIL)', type: 'power_plant', latitude: 8.1710, longitude: 77.7100, city: 'Kudankulam', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Talcher STPS (NTPC)', type: 'power_plant', latitude: 20.9553, longitude: 85.1988, city: 'Talcher', state: 'Odisha', country: 'India', source: 'openstreetmap' },
  { name: 'Korba STPS (NTPC)', type: 'power_plant', latitude: 22.3699, longitude: 82.7033, city: 'Korba', state: 'Chhattisgarh', country: 'India', source: 'openstreetmap' },
  { name: 'Simhadri STPS (NTPC)', type: 'power_plant', latitude: 17.6130, longitude: 83.1430, city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Ramagundam STPS (NTPC)', type: 'power_plant', latitude: 18.7643, longitude: 79.4785, city: 'Ramagundam', state: 'Telangana', country: 'India', source: 'openstreetmap' },
  { name: 'Kahalgaon STPS (NTPC)', type: 'power_plant', latitude: 25.2641, longitude: 87.2393, city: 'Kahalgaon', state: 'Bihar', country: 'India', source: 'openstreetmap' },
  { name: 'Farakka STPS (NTPC)', type: 'power_plant', latitude: 24.8141, longitude: 87.9117, city: 'Farakka', state: 'West Bengal', country: 'India', source: 'openstreetmap' },
  { name: 'Sasan UMPP (Reliance)', type: 'power_plant', latitude: 24.3480, longitude: 82.3750, city: 'Sasan', state: 'Madhya Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Dadri STPS (NTPC)', type: 'power_plant', latitude: 28.5666, longitude: 77.5988, city: 'Dadri', state: 'Uttar Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Sipat STPS (NTPC)', type: 'power_plant', latitude: 22.1034, longitude: 82.2440, city: 'Sipat', state: 'Chhattisgarh', country: 'India', source: 'openstreetmap' },
  { name: 'Unchahar TPS (NTPC)', type: 'power_plant', latitude: 25.8784, longitude: 81.3574, city: 'Unchahar', state: 'Uttar Pradesh', country: 'India', source: 'openstreetmap' },

  // ─── STEEL PLANTS ─────────────────────────────────────────────────────────
  { name: 'Bhilai Steel Plant (SAIL)', type: 'steel_plant', latitude: 21.2090, longitude: 81.3780, city: 'Bhilai', state: 'Chhattisgarh', country: 'India', source: 'openstreetmap' },
  { name: 'Durgapur Steel Plant (SAIL)', type: 'steel_plant', latitude: 23.5176, longitude: 87.3236, city: 'Durgapur', state: 'West Bengal', country: 'India', source: 'openstreetmap' },
  { name: 'Rourkela Steel Plant (SAIL)', type: 'steel_plant', latitude: 22.2132, longitude: 84.8650, city: 'Rourkela', state: 'Odisha', country: 'India', source: 'openstreetmap' },
  { name: 'Bokaro Steel Plant (SAIL)', type: 'steel_plant', latitude: 23.6693, longitude: 85.9647, city: 'Bokaro', state: 'Jharkhand', country: 'India', source: 'openstreetmap' },
  { name: 'Tata Steel Jamshedpur', type: 'steel_plant', latitude: 22.8052, longitude: 86.1891, city: 'Jamshedpur', state: 'Jharkhand', country: 'India', source: 'openstreetmap' },
  { name: 'JSW Steel Vijayanagar', type: 'steel_plant', latitude: 15.1695, longitude: 76.6430, city: 'Toranagallu', state: 'Karnataka', country: 'India', source: 'openstreetmap' },
  { name: 'JSW Steel Dolvi', type: 'steel_plant', latitude: 18.7667, longitude: 72.9700, city: 'Dolvi', state: 'Maharashtra', country: 'India', source: 'openstreetmap' },
  { name: 'Essar Steel (ArcelorMittal) Hazira', type: 'steel_plant', latitude: 21.0940, longitude: 72.6340, city: 'Hazira', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'RINL Visakhapatnam Steel', type: 'steel_plant', latitude: 17.6820, longitude: 83.1900, city: 'Visakhapatnam', state: 'Andhra Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Jindal Steel Raigarh', type: 'steel_plant', latitude: 21.8974, longitude: 83.3968, city: 'Raigarh', state: 'Chhattisgarh', country: 'India', source: 'openstreetmap' },
  { name: 'Bhushan Steel Angul', type: 'steel_plant', latitude: 20.8390, longitude: 85.1010, city: 'Angul', state: 'Odisha', country: 'India', source: 'openstreetmap' },
  { name: 'Salem Steel Plant (SAIL)', type: 'steel_plant', latitude: 11.6530, longitude: 78.1850, city: 'Salem', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Visvesvaraya Iron & Steel (SAIL)', type: 'steel_plant', latitude: 14.0147, longitude: 76.0390, city: 'Bhadravati', state: 'Karnataka', country: 'India', source: 'openstreetmap' },

  // ─── CEMENT PLANTS ────────────────────────────────────────────────────────
  { name: 'ACC Cement Wadi', type: 'cement_plant', latitude: 17.0536, longitude: 76.9670, city: 'Wadi', state: 'Karnataka', country: 'India', source: 'openstreetmap' },
  { name: 'Ambuja Cement Maratha', type: 'cement_plant', latitude: 15.7900, longitude: 74.4100, city: 'Maratha', state: 'Goa', country: 'India', source: 'openstreetmap' },
  { name: 'Ultratech Cement Kotputli', type: 'cement_plant', latitude: 27.7027, longitude: 76.1970, city: 'Kotputli', state: 'Rajasthan', country: 'India', source: 'openstreetmap' },
  { name: 'Ultratech Cement Reddipalayam', type: 'cement_plant', latitude: 11.2780, longitude: 79.0300, city: 'Ariyalur', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Shree Cement Ras', type: 'cement_plant', latitude: 27.0543, longitude: 74.4847, city: 'Ras', state: 'Rajasthan', country: 'India', source: 'openstreetmap' },
  { name: 'Dalmia Bharat Dalmiapuram', type: 'cement_plant', latitude: 11.3836, longitude: 78.6050, city: 'Dalmiapuram', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'India Cements Sankarnagar', type: 'cement_plant', latitude: 8.7490, longitude: 77.7440, city: 'Tirunelveli', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Ramco Cement RR Nagar', type: 'cement_plant', latitude: 13.4960, longitude: 79.8230, city: 'Nellore', state: 'Andhra Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Birla Cement Satna', type: 'cement_plant', latitude: 24.5800, longitude: 80.8340, city: 'Satna', state: 'Madhya Pradesh', country: 'India', source: 'openstreetmap' },
  { name: 'Prism Cement Satna', type: 'cement_plant', latitude: 24.5640, longitude: 80.8180, city: 'Satna', state: 'Madhya Pradesh', country: 'India', source: 'openstreetmap' },

  // ─── LNG TERMINALS ────────────────────────────────────────────────────────
  { name: 'Dahej LNG Terminal (PLL)', type: 'lng_terminal', latitude: 21.7130, longitude: 72.5370, city: 'Dahej', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'Hazira LNG Terminal (Shell)', type: 'lng_terminal', latitude: 21.1000, longitude: 72.6430, city: 'Hazira', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
  { name: 'Kochi LNG Terminal (PLL)', type: 'lng_terminal', latitude: 10.0480, longitude: 76.2250, city: 'Kochi', state: 'Kerala', country: 'India', source: 'openstreetmap' },
  { name: 'Ennore LNG Terminal (IOC)', type: 'lng_terminal', latitude: 13.2270, longitude: 80.3240, city: 'Chennai', state: 'Tamil Nadu', country: 'India', source: 'openstreetmap' },
  { name: 'Dhamra LNG Terminal (Adani)', type: 'lng_terminal', latitude: 20.4430, longitude: 86.8870, city: 'Dhamra', state: 'Odisha', country: 'India', source: 'openstreetmap' },
  { name: 'Mundra LNG Terminal (GSPC)', type: 'lng_terminal', latitude: 22.7550, longitude: 69.6300, city: 'Mundra', state: 'Gujarat', country: 'India', source: 'openstreetmap' },
];

async function seed() {
  console.log(`Seeding ${facilities.length} facilities...`);

  let inserted = 0;
  let skipped = 0;

  for (const f of facilities) {
    const id = randomUUID();
    try {
      await db.query(
        `INSERT INTO facilities (id, name, type, latitude, longitude, city, state, country, source, geometry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326))
         ON CONFLICT DO NOTHING`,
        [id, f.name, f.type, f.latitude, f.longitude, f.city, f.state, f.country, f.source, f.longitude, f.latitude]
      );
      inserted++;
    } catch (e: any) {
      console.warn(`  SKIP ${f.name}: ${e.message}`);
      skipped++;
    }
  }

  console.log(`Done — inserted: ${inserted}, skipped: ${skipped}`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
