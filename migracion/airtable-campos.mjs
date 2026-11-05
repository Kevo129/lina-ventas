// IDs de tablas y campos de la "Base de Ventas" en Airtable.
// Se usan IDs (no nombres) para que la migración no se rompa si alguien renombra un campo.
export const BASE_ID = 'appQEk2ESnsn0hptr';

export const T = {
  cuentas:       'tblN1jqdxw4kpciRr',
  clientes:      'tbl3uLbW1YoZtw3bc',
  productos:     'tbliUUzb3TJjYUT68',
  ordenes:       'tblErAlD55iqKHMfo',
  cotizaciones:  'tbl63YrLa4FNMAzp2',
  pedidos:       'tblPhp1caXk3ZRHsW',
  importaciones: 'tblZreRTY1pu4xfVG',
};

export const F = {
  cuentas: { nombre: 'fldUUbuByUhW6KhhG' },
  clientes: {
    nombre: 'fldIgNT3zGYuR9FQ7', apellido: 'fldedo8A416j74GpF', telefono: 'fldp2CsqDZ7nOgqqK',
    correo: 'fldna5KYLBHBbzLqQ', institucion: 'fldt3mVgu4uiIKozP', rfc: 'fldfgCCX9zCUhrx9L',
    direccion: 'fldp7pNCCAoBslfn6',
  },
  productos: {
    nombre: 'fldg48XOk0N2QPSlS', codigo: 'fldSKynXZttco5BRd', marca: 'fld6UP3ZJEyhpsrLr',
    foto: 'fldttBWfHc4DGbX7Q', ficha: 'fld2sVogxt4lQzy5G',
  },
  ordenes: {
    folio: 'fldbF362PDRdw04P6', referencia: 'fldPmQM0WmsBpCNYC', fecha: 'fld0JaBbePGHNAuJU',
    pagado: 'fld3jdInBYrtJqret', total: 'fldhs7LrJ80Z3TKr6', moneda: 'fldawyflMSXQ5RGDG',
    docOrden: 'fldLkVN8yFU8XKCvD', docFactura: 'fldJ44clQWVf6JON5', proveedor: 'fldj6YP8f1qKhMYSB',
  },
  cotizaciones: {
    folio: 'fldt62MPm8swCkcOx', cliente: 'fld2Mu2fAEPTYBO7c', fecha: 'fld0K4UXPsBMEsyIz',
    pdf: 'fldXdW2BPDHCvjv9K', pagado: 'fldNhafMK6u8AeKnL', total: 'fldHES6dVESPQSc69',
    moneda: 'flduBPuSiyepf8VxY', vendedor: 'fldvliQCmuVBOkoev',
  },
  pedidos: {
    cantidad: 'fldtfuPYltncPTWlj', paqueteria: 'fldVB67rSGiOSDQ4P', guia: 'fldlsE5eo59IZ6Jko',
    producto: 'fldZ07IkfhyWpoXZe', cotizacion: 'fld7T7FZtzjrfUcPE', orden: 'fldBi9GR568ah2rcZ',
    fechaEnvio: 'fldM0nN35FJ0k8r48', entregado: 'fld7O4jnPbYeCZX7Z', pedimento: 'fldXWTwmE5wreyVhz',
    recibido: 'fldBVbJ0QupURQf1U', costo: 'fldZBbYJpSZZRxmUe',
  },
  importaciones: {
    pedimento: 'fldpXavYzdgx7k9Kq', documento: 'flduNWvdLr3HcCyzw', aduana: 'fldweYOapiSZsFSRE',
    fecha: 'fldc29BNTpw0My5hu',
  },
};

// Campos adjuntos a descargar: [tabla, campo, entidad destino, nombre de campo destino]
export const ADJUNTOS = [
  ['cotizaciones', F.cotizaciones.pdf, 'cotizaciones', 'cotizacion'],
  ['productos', F.productos.foto, 'productos', 'foto'],
  ['productos', F.productos.ficha, 'productos', 'ficha_tecnica'],
  ['ordenes', F.ordenes.docOrden, 'ordenes_compra', 'orden_compra'],
  ['ordenes', F.ordenes.docFactura, 'ordenes_compra', 'factura'],
  ['importaciones', F.importaciones.documento, 'importaciones', 'documento'],
];

// Nombre del adjunto en disco (válido en Windows, Mac y Linux)
export const nombreLocal = (att) => `${att.id}__${att.filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 150)}`;
