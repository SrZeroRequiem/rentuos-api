import express, { Request, Response } from 'express';
import cors from 'cors';
import { locations} from './locations';

interface Location {
  city: string;
  district: string;
  units: number;
}

interface CityData {
  city: string;
  units: number;
}

interface DistrictData {
  city: string;
  district: string;
  units: number;
}

interface SearchResult {
  found: boolean;
  rate: number;
  name: string | null;
  city: string | null;
  type: string;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port: number = parseInt(process.env.PORT || '3001');

// Helper functions
const normalizeString = (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getCity = (city: string): Location[] =>
  locations.filter((loc: Location) => normalizeString(loc.city).toLowerCase() === normalizeString(city).toLowerCase());

const getDistrict = (district: string): Location | null => {
  const districtData: Location | undefined = locations.find((loc: Location) => normalizeString(loc.district).toLowerCase() === normalizeString(district).toLowerCase());
  return districtData ? districtData : null;
};

// Endpoints
app.get('/', (_req: Request, res: Response) => res.json(locations));

app.get('/cities', (_req: Request, res: Response) => {
  const cities: string[] = [...new Set(locations.map((loc: Location) => loc.city))];
  res.json(cities);
});

app.get('/districts', (_req: Request, res: Response) => {
  const districts: string[] = locations.map((loc: Location) => loc.district);
  res.json(districts);
});

app.get('/:city/districts', (req: Request, res: Response) => {
  const cityData: Location[] = getCity(req.params.city);
  cityData.length > 0
    ? res.json(cityData.map((loc: Location) => loc.district)).status(200)
    : res.sendStatus(404);
});

app.get('/:city', (req: Request, res: Response) => {
  const cityData: Location[] = getCity(req.params.city);
  if (cityData.length > 0) {
    const cityUnits: number = cityData.reduce((acc: number, loc: Location) => acc + loc.units, 0);
    const cityUnitsData: CityData = { city: req.params.city, units: cityUnits };
    res.json(cityUnitsData).status(200);
  } else {
    const districtData: DistrictData | null = getDistrict(req.params.city);
    districtData
      ? res.json({ city: districtData.city, district: districtData.district, units: districtData.units }).status(200)
      : res.sendStatus(404);
  }
});

app.get('/search/:query', (req: Request, res: Response) => {
  const query: string = normalizeString(req.params.query);
  if (query.length < 3) {
    res.status(400).json({ error: "Query must be at least 3 characters long" });
    return;
  }

  let results: SearchResult[] = [];

  const queryWords = query.split(' ');

  locations.forEach((loc: Location) => {
    const normalizedCity = normalizeString(loc.city).toLowerCase();
    const normalizedDistrict = normalizeString(loc.district).toLowerCase();

    let districtResult: SearchResult = { found: false, rate: 0, name: null, city: null, type: '' };
    let cityResult: SearchResult = { found: false, rate: 0, name: null, city: null, type: '' };

    queryWords.forEach((word: string) => {
      if (normalizedCity.includes(word) || word.includes(normalizedCity)) {
        const rate = Math.min(word.length / (normalizedCity.replace(" ","").length), (normalizedCity.replace(" ","").length) / word.length);
        cityResult = {
          found: true,
          rate: cityResult.rate + rate,
          name: loc.city,
          city: loc.city,
          type: 'CITY',
        };
      }

      if (normalizedDistrict.includes(word) || word.includes(normalizedDistrict)) {
        const rate = Math.min(word.length / (normalizedDistrict.replace(" ","").length), (normalizedCity.replace(" ","").length) / word.length);
        districtResult = {
          found: true,
          rate: districtResult.rate + rate,
          name: loc.district,
          city: loc.city,
          type: 'DISTRICT',
        };
      }
    });
    districtResult.found && results.push(districtResult);
    cityResult.found && results.push(cityResult);

  });

  results.sort((a, b) => b.rate - a.rate);
  results = results.filter((res, index, self) =>
    index === self.findIndex((r) => r.name === res.name)
  );

  results.length > 0 ? res.status(200).json(results) : res.status(404).json({ found: false, rate:null, name: null, city: null, type: null });
});

// Start server
app.listen(port, () => console.log(`API listening at http://localhost:${port}`));

