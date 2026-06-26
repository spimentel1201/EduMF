import ApiError from './ApiError';

export class DebtNotFoundError extends ApiError {
  constructor(debtId: string) {
    super(`Deuda con id '${debtId}' no encontrada`, 404);
    Object.setPrototypeOf(this, DebtNotFoundError.prototype);
  }
}

export class InvalidPaymentStateError extends ApiError {
  constructor(currentStatus: string, expectedStatus: string) {
    super(
      `Transición de estado inválida: la deuda está en estado '${currentStatus}', se esperaba '${expectedStatus}'`,
      409
    );
    Object.setPrototypeOf(this, InvalidPaymentStateError.prototype);
  }
}

export class CashRegisterNotOpenError extends ApiError {
  constructor(cashRegisterId: string) {
    super(`La caja '${cashRegisterId}' no está abierta o no existe`, 409);
    Object.setPrototypeOf(this, CashRegisterNotOpenError.prototype);
  }
}

export class CashRegisterAlreadyOpenError extends ApiError {
  constructor() {
    super('Ya existe una caja abierta para este usuario', 409);
    Object.setPrototypeOf(this, CashRegisterAlreadyOpenError.prototype);
  }
}
