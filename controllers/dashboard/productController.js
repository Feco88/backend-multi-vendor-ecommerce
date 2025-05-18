const formidable = require("formidable")
const { responseReturn } = require("../../utilities/response")
const cloudinary = require('cloudinary').v2
const productModel = require('../../models/productModel')

class productController{
//Eladó - Termék hozzáadása metódus
 add_product = async(req,res) => {
  const {id} = req;
  const form = formidable({ multiples: true })
  form.parse(req, async(err, field, files) => {
  //űrlapadatok tárolása változókban (field,files)
    let {name, category,description, stock,price, discount,shopName,brand} = field;
    let {images} = files;
    name = name.trim()
    const slug = name.split(' ').join('-')
  // a név, ha szóközt tartalmaz, akkor helyettesítse kötőjellel
    cloudinary.config({
        cloud_name: process.env.cloud_name,
        api_key: process.env.api_key,
        api_secret: process.env.api_secret,
        secure: true
    })
  // képek feltöltésének beállítása a cloudinary-ra
  try {
    let allImageUrl = [];

  //egyetlen képpel rendelkező termék képének megjelenítése
    if (!Array.isArray(images)) {
        images = [images]; //tömbbé alakítjuk, ha egyetlen kép kerül feltöltésre
    }

     for (let i = 0; i < images.length; i++) {
     const result = await cloudinary.uploader.upload(images[i].filepath, {folder: 'products'});
     allImageUrl.push(result.url);   
     //allImageUrl = [...allImageUrl, result.url] 
     }
  // adatok beszúrása az adatbázisba
  await productModel.create({
    sellerId: id,
    name,
    slug,
    shopName,
    category: category.trim(),
    description: description.trim(),
    stock: parseInt(stock),
    price: parseInt(price),
    discount: parseInt(discount),
    images: allImageUrl,
    brand: brand.trim()  
  })
    responseReturn(res, 201,{ message : 'Termék sikeresen hozzáadva!'})    
    } catch (error) {
      responseReturn(res, 500,{ error : error.message})
    }
  })
 }
//Eladó - Termék hozzáadása metódus vége
// Termék megjelenítése metódus
    products_get = async(req,res) => {
    const {page,searchValue,parPage} = req.query
    const {id} = req;

    const skipPage = parseInt(parPage) * (parseInt(page) -1)
    try {
        if (searchValue) {
            const products = await productModel.find({
                $text: { $search: searchValue },
                sellerId: id
            }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
            const totalProduct = await productModel.find({
                $text: { $search: searchValue },
                sellerId: id
            }).countDocuments()
            responseReturn(res, 200,{products,totalProduct})
        } else {
            const products = await productModel.find({ sellerId:id }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
            const totalProduct = await productModel.find({ sellerId:id }).countDocuments()
            responseReturn(res, 200,{products,totalProduct})
        }
        
    } catch (error) {
        console.log(error)
    }
  }
// Termék megjelenítése metódus vége
// Termék megjelenítése szerkesztőoldalon metódus
  product_get = async(req,res) => {
    const { productId } = req.params;
    try {
        const product = await productModel.findById(productId)
        responseReturn(res,200,{product})
    } catch (error) {
        console.log(error)
    }
  }
// Termék megjelenítése szerkesztőoldalon metódus vége
// Termék frissítése metódus
    product_update = async (req, res) => {
        let {name, description, stock,price,category,discount,brand,productId} = req.body;
        name = name.trim()
        const slug = name.split(' ').join('-')

        try {
            await productModel.findByIdAndUpdate(productId, {
                name, description, stock,price,category,discount,brand,productId, slug
            })
            const product = await productModel.findById(productId)
            responseReturn(res, 200,{product, message : 'A termék adatai sikeresen módosítva!'})
        } catch (error) {
            responseReturn(res, 500,{ error : error.message })
        } 
    }
// Termék frissítése metódus vége
// Termékkép frissítése metódus
    product_image_update = async(req,res) => {
        const form = formidable({ multiples: true })
        form.parse(req, async(err,field,files) => {
         const {oldImage,productId} = field;
         const { newImage } = files
          if (err) {
            responseReturn(res, 400,{ error: err.message})
          } else{
            try {
                cloudinary.config({
                    cloud_name: process.env.cloud_name,
                    api_key: process.env.api_key,
                    api_secret: process.env.api_secret,
                    secure: true
                })
        const result = await cloudinary.uploader.upload(newImage.filepath,{folder:'products'})
        if (result) {
            let {images} = await productModel.findById(productId)
            const index = images.findIndex(img => img === oldImage)
            images[index] = result.url;
            await productModel.findByIdAndUpdate(productId,{images})
            const product = await productModel.findById(productId)
            responseReturn(res,200,{product, message: 'Termékkép sikeresen módosítva!'})
        } else {
            responseReturn(res,404,{error: 'Termékkép feltöltése sikertelen!'})
        }
            } catch (error) {
            responseReturn(res,404,{error: error.message })
            }
          }
        })
    }
// Termékkép frissítése metódus vége
}

module.exports = new productController()