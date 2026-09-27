import { Router, Request, Response } from 'express';
import { initialVehicle, carCatalog } from '../data/mock-db';

export const vehicleRouter = Router();

let currentVehicle = { ...initialVehicle };

// GET /api/vehicle
vehicleRouter.get('/', (_req: Request, res: Response) => {
  res.json(currentVehicle);
});

// GET /api/vehicle/catalog
vehicleRouter.get('/catalog', (_req: Request, res: Response) => {
  res.json({
    total: carCatalog.length,
    vehicles: carCatalog,
  });
});

// PUT /api/vehicle
vehicleRouter.put('/', (req: Request, res: Response) => {
  const { manufacturer, model, batteryCapacityKwh, currentSoc, targetSoc, maxDcPowerKw, estimatedRangeKm } = req.body;

  if (manufacturer) currentVehicle.manufacturer = manufacturer;
  if (model) currentVehicle.model = model;
  if (batteryCapacityKwh) currentVehicle.batteryCapacityKwh = Number(batteryCapacityKwh);
  if (currentSoc !== undefined) currentVehicle.currentSoc = Number(currentSoc);
  if (targetSoc !== undefined) currentVehicle.targetSoc = Number(targetSoc);
  if (maxDcPowerKw) currentVehicle.maxDcPowerKw = Number(maxDcPowerKw);
  if (estimatedRangeKm) currentVehicle.estimatedRangeKm = Number(estimatedRangeKm);

  res.json({
    message: 'Veículo atualizado com sucesso',
    vehicle: currentVehicle,
  });
});
