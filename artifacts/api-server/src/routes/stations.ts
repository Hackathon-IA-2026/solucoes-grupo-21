import { Router, Request, Response } from 'express';
import { initialStations } from '../data/mock-db';

export const stationsRouter = Router();

// GET /api/stations
stationsRouter.get('/', (req: Request, res: Response) => {
  const { search, renewableMin, maxPowerMin } = req.query;

  let filtered = [...initialStations];

  if (typeof search === 'string' && search.trim()) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.address.toLowerCase().includes(term) ||
        s.operator.toLowerCase().includes(term)
    );
  }

  if (typeof renewableMin === 'string') {
    const min = Number(renewableMin);
    if (!isNaN(min)) {
      filtered = filtered.filter((s) => s.renewableShare >= min);
    }
  }

  if (typeof maxPowerMin === 'string') {
    const min = Number(maxPowerMin);
    if (!isNaN(min)) {
      filtered = filtered.filter((s) => s.specs.maxPowerKw >= min);
    }
  }

  res.json({
    total: filtered.length,
    stations: filtered,
  });
});

// GET /api/stations/:id
stationsRouter.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const station = initialStations.find((s) => s.id === id);

  if (!station) {
    res.status(404).json({ error: 'Estação de recarga não encontrada' });
    return;
  }

  res.json(station);
});
