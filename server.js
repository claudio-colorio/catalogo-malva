import express from 'express';
import cors from 'cors';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json());

const credenciales = JSON.parse(fs.readFileSync('./claves-google.json', 'utf8'));

const serviceAccountAuth = new JWT({
  email: credenciales.client_email,
  key: credenciales.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

app.get('/api/productos', async (req, res) => {
  try {
    const ID_PLANILLA = '1-SfF8BmKXRm1_28UEFOs06H3Ge1c7nOkcMu8V_jsIB4'; 

    const doc = new GoogleSpreadsheet(ID_PLANILLA, serviceAccountAuth);
    await doc.loadInfo(); 
    const sheet = doc.sheetsByIndex[0]; 
    const rows = await sheet.getRows();  

    const productos = rows.map(row => {
      let celdaImagen = row.get('Imagen') || '';
      let listaImagenes = [];

      // Si la celda tiene texto, separamos por comas
      if (celdaImagen.trim() !== '') {
        const enlacesSeparados = celdaImagen.split(',');
        
        enlacesSeparados.forEach(link => {
          let linkLimpio = link.trim();
          if (linkLimpio.includes('drive.google.com')) {
            const match = linkLimpio.match(/\/d\/([^/]+)/);
            if (match && match[1]) {
              listaImagenes.push(`https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`);
            }
          } else if (linkLimpio !== '') {
            listaImagenes.push(linkLimpio); // Por si pones un link común de internet
          }
        });
      }

      // Si no tiene ninguna foto, le ponemos la gris por defecto
      if (listaImagenes.length === 0) {
        listaImagenes.push('https://via.placeholder.com/300x300?text=Sin+Foto');
      }

      return {
        nombre: row.get('Nombre'),
        categoria: row.get('Categorias'), // Lee la columna B "Categorias"
        color: row.get('Color'), // Lee la columna D "Color"
        subcategoria: row.get('subcategoria'), // ¡Lee directo la columna F "subcategoria"!
        precio: row.get('Precio'),
        descripcion: row.get('Descripcion'),
        marca: row.get('Marca'),
        codigo: row.get('Codigo proveedor'),
        imagenes: listaImagenes // IMPORTANTE: Ahora enviamos una LISTA de imágenes
      };
    });

    res.json(productos);
  } catch (error) {
    console.error("Error al leer datos:", error);
    res.status(500).json({ error: 'Error interno en el servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});