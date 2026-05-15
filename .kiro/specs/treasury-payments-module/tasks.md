# Implementation Plan: Treasury & Payments Module

## Overview

Implementación incremental del módulo de Tesorería y Pagos para EduMF. Se construye de abajo hacia arriba: modelos Mongoose → errores custom → servicio de negocio → controladores y rutas → registro en server.ts → servicio frontend. Las sesiones MongoDB garantizan atomicidad en las operaciones críticas. Todos los montos usan `Decimal128`.

## Tasks

- [x] 1. Crear modelos Mongoose (Debt, CashRegister, Transaction)
  - [x] 1.1 Crear `backend/src/models/Debt.ts`
    - Definir el tipo `DebtStatus` y la interfaz `IDebt` con todos los campos del diseño
    - Implementar `DebtSchema` con validaciones requeridas, enum de estados y `default: 'PENDIENTE'`
    - Configurar `toJSON` transform: exponer `id`, eliminar `_id` y `__v`, serializar `amount` como string
    - Agregar índices: `studentId`, `status`, `concept` (text), `dueDate`
    - Exportar el modelo `Debt`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Crear `backend/src/models/CashRegister.ts`
    - Definir el tipo `CashRegisterStatus` y la interfaz `ICashRegister` con todos los campos del diseño
    - Implementar `CashRegisterSchema` con campos opcionales (`closedByUserId`, `closedAt`, `realBalance`) y `default: 'ABIERTA'`
    - Configurar `toJSON` transform: exponer `id`, eliminar `_id` y `__v`, serializar los tres campos de balance como string
    - Agregar índices: `{ openedByUserId, status }` compuesto y `openedAt` descendente
    - Exportar el modelo `CashRegister`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.3 Crear `backend/src/models/Transaction.ts`
    - Definir los tipos `TransactionType` y `PaymentMethod`, y la interfaz `ITransaction`
    - Implementar `TransactionSchema` con `cashRegisterId` y `debtId` opcionales, y `registeredByUserId` requerido
    - Configurar `toJSON` transform: exponer `id`, eliminar `_id` y `__v`, serializar `amount` como string
    - Agregar índices: `cashRegisterId`, `debtId`, `type`, `createdAt` descendente
    - Exportar el modelo `Transaction`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 1.4 Escribir tests unitarios para los modelos
    - Verificar que `toJSON` serializa `amount` como string y no como número
    - Verificar que `toJSON` expone `id` y omite `_id` y `__v`
    - Verificar que los campos requeridos lanzan error de validación cuando están ausentes
    - _Requirements: 1.3, 1.4, 2.3, 3.3_

- [x] 2. Crear errores custom de tesorería (`backend/src/middleware/treasuryErrors.ts`)
  - Importar `ApiError` desde `./ApiError`
  - Implementar `DebtNotFoundError` extendiendo `ApiError` con status 404 y mensaje con el `debtId`
  - Implementar `InvalidPaymentStateError` extendiendo `ApiError` con status 409 y mensaje con `currentStatus` y `expectedStatus`
  - Implementar `CashRegisterNotOpenError` extendiendo `ApiError` con status 409 y mensaje con el `cashRegisterId`
  - Implementar `CashRegisterAlreadyOpenError` extendiendo `ApiError` con status 409
  - Usar `Object.setPrototypeOf(this, XxxError.prototype)` en cada constructor para preservar `instanceof`
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 3. Implementar helpers de Decimal128 y TreasuryService (`backend/src/services/TreasuryService.ts`)
  - [x] 3.1 Implementar helpers de Decimal128
    - Escribir `toDecimal128(value, fieldName)`: valida con regex `/^\d+(\.\d+)?$/`, lanza `ApiError.badRequest` si inválido, retorna `Decimal128.fromString`
    - Escribir `sumDecimal128(values)`: suma usando BigInt con escala fija de 8 decimales para evitar float
    - Escribir `subtractDecimal128(a, b)`: resta usando la misma aritmética BigInt
    - _Requirements: 12.1, 12.2, 12.4_

  - [ ]* 3.2 Escribir property tests para helpers de Decimal128
    - **Property 1: Round-trip de conversión** — `toDecimal128(str).toString() === str` para cualquier string decimal válido con hasta 8 decimales
    - **Validates: Requirements 12.2, 12.3**
    - **Property 2: Conmutatividad de suma** — `sumDecimal128([a, b]).toString() === sumDecimal128([b, a]).toString()`
    - **Validates: Requirements 12.4**
    - **Property 3: Asociatividad de suma** — `sumDecimal128([a, b, c]) === sumDecimal128([sumDecimal128([a, b]), c])`
    - **Validates: Requirements 12.4**
    - **Property 4: Inverso de suma** — `subtractDecimal128(sumDecimal128([a, b]), b).toString() === a.toString()`
    - **Validates: Requirements 12.4**

  - [x] 3.3 Implementar `TreasuryService.createDebt`
    - Validar presencia de `studentId`, `concept`, `amount`, `dueDate`; lanzar `ApiError.badRequest` si falta alguno
    - Convertir `amount` con `toDecimal128`, construir `ObjectId` para `studentId`, parsear `dueDate` como `Date`
    - Llamar `Debt.create(...)` y retornar el documento creado
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 3.4 Implementar `TreasuryService.listDebts`
    - Construir filtro dinámico con `status`, `studentId` (como ObjectId) y `search` (regex case-insensitive sobre `concept`)
    - Aplicar paginación con `page` (default 1) y `limit` (default 10)
    - Retornar `{ data, total, page, limit, totalPages: Math.ceil(total / limit) }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 15.4_

  - [ ]* 3.5 Escribir property tests para paginación de listDebts
    - **Property 5: Número de páginas** — para `n` deudas y `limit = k`, `totalPages === Math.ceil(n / k)`
    - **Validates: Requirements 5.6, 15.4**
    - **Property 6: Suma de elementos por página** — la suma de elementos en todas las páginas es igual a `total`
    - **Validates: Requirements 5.6, 15.4**

  - [x] 3.6 Implementar `TreasuryService.getDebtById`
    - Buscar con `Debt.findById(id)`; lanzar `DebtNotFoundError` si no existe
    - _Requirements: 5.5_

  - [x] 3.7 Implementar `TreasuryService.reportTransfer`
    - Buscar deuda; lanzar `DebtNotFoundError` si no existe
    - Implementar idempotencia: si `status === 'EN_VALIDACION'` y `voucherUrl` coincide, retornar la deuda sin cambios
    - Validar que `status` sea `PENDIENTE` o `VENCIDO`; lanzar `InvalidPaymentStateError` en caso contrario
    - Actualizar `status = 'EN_VALIDACION'` y `voucherUrl`, guardar la deuda
    - Crear `Transaction` con `type: 'INGRESO'`, `paymentMethod: 'TRANSFERENCIA'`, `amount: debt.amount`, `voucherUrl`, `registeredByUserId`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 3.8 Escribir property tests para transiciones de estado de Debt
    - **Property 7: Estados terminales** — una deuda en `PAGADO` o `ANULADO` lanza `InvalidPaymentStateError` al llamar `reportTransfer`
    - **Validates: Requirements 6.2**
    - **Property 8: Idempotencia de reportTransfer** — llamar `reportTransfer` dos veces con el mismo `voucherUrl` cuando la deuda está en `EN_VALIDACION` no crea un segundo `Transaction`
    - **Validates: Requirements 6.4**

  - [x] 3.9 Implementar `TreasuryService.approveTransfer`
    - Iniciar sesión MongoDB con `mongoose.startSession()` y `session.startTransaction()`
    - Buscar deuda con `.session(session)`; lanzar `DebtNotFoundError` si no existe
    - Validar `status === 'EN_VALIDACION'`; lanzar `InvalidPaymentStateError` en caso contrario
    - Cambiar `status = 'PAGADO'` y guardar con `{ session }`
    - Crear `Transaction` con `{ session }` usando `paymentMethod: 'TRANSFERENCIA'`
    - Llamar `session.commitTransaction()` en el bloque `try`, `session.abortTransaction()` en el `catch`
    - Cerrar sesión en `finally`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 3.10 Escribir property test para atomicidad de approveTransfer
    - **Property 9: Atomicidad de aprobación** — si la creación del Transaction falla, el estado de la Debt permanece `EN_VALIDACION` (no `PAGADO`)
    - **Validates: Requirements 7.2, 7.4_

  - [x] 3.11 Implementar `TreasuryService.openCashRegister`
    - Verificar que no exista una `CashRegister` con `status: 'ABIERTA'` para el mismo `openedByUserId`; lanzar `CashRegisterAlreadyOpenError` si existe
    - Convertir `initialBalance` con `toDecimal128`
    - Crear `CashRegister` con `initialBalance` y `expectedBalance` iguales al valor proporcionado, `openedAt: new Date()`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 3.12 Escribir property test para unicidad de caja abierta
    - **Property 10: Una sola caja abierta por usuario** — no puede existir más de una `CashRegister` con `status = 'ABIERTA'` para el mismo `openedByUserId`
    - **Validates: Requirements 8.4**

  - [x] 3.13 Implementar `TreasuryService.registerIncome`
    - Iniciar sesión MongoDB
    - Buscar `CashRegister`; lanzar `CashRegisterNotOpenError` si no existe o `status !== 'ABIERTA'`
    - Buscar `Debt`; lanzar `DebtNotFoundError` si no existe
    - Convertir `amount` con `toDecimal128`
    - Cambiar `debt.status = 'PAGADO'` y guardar con `{ session }`
    - Crear `Transaction` con `paymentMethod: 'EFECTIVO'`, `cashRegisterId`, `debtId`, `{ session }`
    - Actualizar `cashRegister.expectedBalance = sumDecimal128([cashRegister.expectedBalance, amountD128])` y guardar con `{ session }`
    - Commit/abort/endSession en try/catch/finally
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 3.14 Escribir property test para atomicidad de registerIncome
    - **Property 11: Atomicidad de ingreso en caja** — si la actualización de `expectedBalance` falla, el estado de la Debt no cambia y no se crea Transaction
    - **Validates: Requirements 9.2**

  - [x] 3.15 Implementar `TreasuryService.closeCashRegister`
    - Buscar `CashRegister`; lanzar `ApiError.notFound` si no existe
    - Validar `status === 'ABIERTA'`; lanzar `CashRegisterNotOpenError` si ya está cerrada
    - Obtener todas las transacciones `INGRESO` y `EGRESO` de esa caja
    - Calcular `expectedBalance = subtractDecimal128(sumDecimal128([initialBalance, ...ingresos]), sumDecimal128(egresos))` usando Decimal128
    - Asignar `expectedBalance`, `realBalance` (via `toDecimal128`), `closedAt`, `closedByUserId`, `status = 'CERRADA'`
    - Guardar y retornar el documento
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 3.16 Escribir property test para invariante de expectedBalance al cerrar caja
    - **Property 12: Invariante de expectedBalance** — al cerrar una caja, `expectedBalance = initialBalance + sum(INGRESO) - sum(EGRESO)` calculado con Decimal128
    - **Validates: Requirements 10.1, 10.5, 12.4**

  - [x] 3.17 Implementar `TreasuryService.listCashRegisters`
    - Paginación con `page` (default 1) y `limit` (default 10), ordenado por `openedAt` descendente
    - Retornar `{ data, total, page, limit, totalPages }`
    - _Requirements: 11.1_

  - [x] 3.18 Implementar `TreasuryService.getCashRegisterById`
    - Buscar `CashRegister`; lanzar `ApiError.notFound` si no existe
    - Obtener todas las `Transaction` de esa caja ordenadas por `createdAt` descendente
    - Retornar `{ cashRegister, transactions }`
    - _Requirements: 11.2_

  - [x] 3.19 Implementar `TreasuryService.listTransactions`
    - Construir filtro con `cashRegisterId` (como ObjectId) si se proporciona
    - Retornar transacciones ordenadas por `createdAt` descendente
    - _Requirements: 11.3_

- [ ] 4. Checkpoint — Verificar lógica de servicio
  - Asegurarse de que todos los tests del servicio pasen, preguntar al usuario si hay dudas antes de continuar.

- [x] 5. Implementar controladores (`backend/src/controllers/treasuryController.ts`)
  - [x] 5.1 Implementar controladores de Debt
    - `createDebt`: validar campos requeridos en `req.body`, delegar en `TreasuryService.createDebt`, responder `201 { success: true, data: debt }`
    - `listDebts`: extraer query params (`status`, `studentId`, `search`, `page`, `limit`), delegar en `TreasuryService.listDebts`, responder `200 { success: true, ...result }`
    - `getDebtById`: delegar en `TreasuryService.getDebtById(req.params.id)`, responder `200 { success: true, data: debt }`
    - `reportTransfer`: validar `voucherUrl` en body, delegar en `TreasuryService.reportTransfer`, responder `200 { success: true, data: debt }`
    - Todos los handlers con `try/catch` y `next(err)`
    - _Requirements: 4.1, 4.3, 5.1, 5.5, 6.1, 6.3, 16.1, 16.2, 16.3, 16.4_

  - [x] 5.2 Implementar controladores de Validations y CashRegisters
    - `approveTransfer`: delegar en `TreasuryService.approveTransfer(req.params.id, req.user.id)`, responder `200 { success: true, data: debt }`
    - `openCashRegister`: validar `initialBalance` en body, delegar en `TreasuryService.openCashRegister`, responder `201 { success: true, data: cashRegister }`
    - `registerIncome`: validar `debtId` y `amount` en body, delegar en `TreasuryService.registerIncome`, responder `200 { success: true, data: result }`
    - `closeCashRegister`: validar `realBalance` en body, delegar en `TreasuryService.closeCashRegister`, responder `200 { success: true, data: cashRegister }`
    - `listCashRegisters`: extraer `page` y `limit`, delegar en `TreasuryService.listCashRegisters`, responder `200 { success: true, ...result }`
    - `getCashRegisterById`: delegar en `TreasuryService.getCashRegisterById(req.params.id)`, responder `200 { success: true, data: result }`
    - `listTransactions`: extraer `cashRegisterId` de query, delegar en `TreasuryService.listTransactions`, responder `200 { success: true, data: transactions }`
    - Todos los handlers con `try/catch` y `next(err)`
    - _Requirements: 7.1, 7.6, 8.1, 8.6, 9.1, 9.6, 10.1, 10.6, 11.1, 11.4, 16.1, 16.2, 16.3, 16.4_

  - [ ]* 5.3 Escribir tests unitarios para controladores
    - Mockear `TreasuryService` y verificar que los controladores devuelven los status codes y envelopes correctos
    - Verificar que los errores de validación de body retornan 400
    - _Requirements: 16.2, 16.3_

- [x] 6. Crear archivo de rutas (`backend/src/routes/treasuryRoutes.ts`)
  - Importar `Router` de Express y `protect`, `authorize` de `authMiddleware`
  - Importar todos los handlers del controlador
  - Aplicar `router.use(protect)` para requerir JWT en todas las rutas
  - Registrar rutas de Debts: `POST /debts` (admin), `GET /debts` (any), `GET /debts/:id` (any), `POST /debts/:id/report-transfer` (any)
  - Registrar ruta de Validations: `POST /validations/:id/approve` (admin)
  - Registrar rutas de CashRegisters: `POST /cash-registers/open` (admin), `POST /cash-registers/:id/income` (admin), `POST /cash-registers/:id/close` (admin), `GET /cash-registers` (admin), `GET /cash-registers/:id` (admin)
  - Registrar ruta de Transactions: `GET /transactions` (admin)
  - Exportar el router
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 7. Registrar rutas treasury en `backend/src/server.ts`
  - Agregar `import treasuryRoutes from './routes/treasuryRoutes';` junto a los demás imports de rutas
  - Agregar `app.use('/api/treasury', treasuryRoutes);` dentro de `startServer()`, antes del `errorHandler`
  - _Requirements: 14.1, 16.1_

- [ ] 8. Checkpoint — Verificar integración backend
  - Asegurarse de que el backend compila sin errores TypeScript (`tsc --noEmit`), preguntar al usuario si hay dudas antes de continuar.

- [x] 9. Crear servicio frontend (`src/services/treasuryService.ts`)
  - [x] 9.1 Definir tipos TypeScript del módulo treasury
    - Exportar tipos: `DebtStatus`, `CashRegisterStatus`, `TransactionType`, `PaymentMethod`
    - Exportar interfaces: `Debt`, `CashRegister`, `Transaction`, `PaginatedResponse<T>`, `CreateDebtPayload`, `ListDebtsQuery`
    - Asegurar que `amount`, `initialBalance`, `expectedBalance`, `realBalance` sean `string` (no `number`) en las interfaces
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 9.2 Implementar métodos de Debts en `treasuryService`
    - `createDebt(payload: CreateDebtPayload)`: `POST /treasury/debts`, retornar `Debt`
    - `listDebts(query?: ListDebtsQuery)`: `GET /treasury/debts`, retornar `PaginatedResponse<Debt>`
    - `getDebtById(id: string)`: `GET /treasury/debts/:id`, retornar `Debt`
    - `reportTransfer(debtId, voucherUrl)`: `POST /treasury/debts/:id/report-transfer`, retornar `Debt`
    - `approveTransfer(debtId)`: `POST /treasury/validations/:id/approve`, retornar `Debt`
    - Usar la instancia `api` de `./api` en todas las llamadas
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 9.3 Implementar métodos de CashRegisters y Transactions en `treasuryService`
    - `openCashRegister(initialBalance: string)`: `POST /treasury/cash-registers/open`, retornar `CashRegister`
    - `registerIncome(cashRegisterId, debtId, amount)`: `POST /treasury/cash-registers/:id/income`, retornar `{ cashRegister, transaction }`
    - `closeCashRegister(cashRegisterId, realBalance)`: `POST /treasury/cash-registers/:id/close`, retornar `CashRegister`
    - `listCashRegisters(page?, limit?)`: `GET /treasury/cash-registers`, retornar `PaginatedResponse<CashRegister>`
    - `getCashRegisterById(id)`: `GET /treasury/cash-registers/:id`, retornar `{ cashRegister, transactions }`
    - `listTransactions(cashRegisterId?)`: `GET /treasury/transactions`, retornar `Transaction[]`
    - _Requirements: 15.3_

  - [ ]* 9.4 Escribir property tests para serialización de Decimal128 en respuestas
    - **Property 13: Tipo string en campos monetarios** — todos los campos monetarios en las respuestas JSON son `string`, verificable con `typeof field === 'string'`
    - **Validates: Requirements 12.3, 15.1**
    - **Property 14: Formato decimal válido** — los strings de montos en respuestas cumplen `/^\d+(\.\d+)?$/`
    - **Validates: Requirements 12.3**

- [ ] 10. Checkpoint final — Verificar compilación completa
  - Ejecutar `tsc --noEmit` en el backend y verificar que no hay errores de tipos en el frontend
  - Asegurarse de que todos los tests pasen, preguntar al usuario si hay dudas antes de continuar.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los property tests usan `fast-check` (ya disponible o instalar con `npm install --save-dev fast-check`)
- Las sesiones MongoDB requieren un replica set; en desarrollo local usar `mongod --replSet rs0` o MongoDB Atlas
- Los helpers `toDecimal128`, `sumDecimal128` y `subtractDecimal128` son funciones puras y pueden testearse sin base de datos
- El `errorHandler` global ya maneja `ApiError` y sus subclases; no se requieren cambios en ese middleware
