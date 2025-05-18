const formidable = require("formidable")
const { responseReturn } = require("../../utilities/response")
const cloudinary = require('cloudinary').v2
const categoryModel = require('../../models/categoryModel')

class categoryController {
//Kategória hozzáadása metódus kezdete
 add_category = async(req, res) => {
    const form = formidable()
    form.parse(req, async(err,fields,files)=>{
        if (err) {
            responseReturn(res, 404, {error: 'Ismeretlen hiba történt'})
        } else {
            let {name} = fields
            let {image} = files
            //bármilyen kategória név megadása esetén,
            //amely szóközöket tartalmaz
            //tegyen közé '-' jelet
            //pl. mans tshirt --> mans-tshirt
            name = name.trim()
            const slug = name.split(' ').join('-')

        cloudinary.config({
            cloud_name: process.env.cloud_name,
            api_key: process.env.api_key,
            api_secret: process.env.api_secret,
            secure: true
        })
        try {
            
        const result = await cloudinary.uploader.upload(
        image.filepath, {folder: 'categorys'})

        if (result) {
            const category = await categoryModel.create({
                name,
                slug,
                image: result.url
            })
         responseReturn(res, 201, { category,message: 'Kategória sikeresen hozzáadva!'})
        } else {
         responseReturn(res, 404, {error: 'A kép feltöltése sikertelen!'})
        }
        } catch (error) {
         responseReturn(res, 500, {error: 'Belső szerverhiba!'})
        }
     }
    })
 }
//Kategória hozzáadása metódus vége
//Kategória keresése metódus kezdete
    get_category = async(req, res) => {
        const {page,searchValue,parPage} = req.query

        try {
            let skipPage = ''
            if (parPage && page) {
                skipPage = parseInt(parPage) * (parseInt(page) -1)
            }
            if (searchValue && page && parPage) {
                const categorys = await categoryModel.find({
                    $text: { $search: searchValue }
                }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
                const totalCategory = await categoryModel.find({
                    $text: { $search: searchValue }
                }).countDocuments()
                responseReturn(res, 200,{categorys,totalCategory})
            }
            else if(searchValue === '' && page && parPage) {
                const categorys = await categoryModel.find({ }).skip(skipPage).limit(parPage).sort({ createdAt: -1})
                const totalCategory = await categoryModel.find({ }).countDocuments()
                responseReturn(res, 200,{categorys,totalCategory})
            }
            
            else {
                const categorys = await categoryModel.find({ }).sort({ createdAt: -1})
                const totalCategory = await categoryModel.find({ }).countDocuments()
                responseReturn(res, 200,{categorys,totalCategory})
            }
        } catch (error) {
            console.log(error.message)
        }
    }
//Kategória keresése metódus vége
//Admin - Kategória szerkesztése metódus kezdete
 update_category = async(req, res) => {
  const form = formidable()
   form.parse(req, async(err,fields,files)=>{
    if (err) {
     responseReturn(res, 404, {error: 'Ismeretlen hiba történt'})
    } else {
      let {name} = fields
      let {image} = files
      const {id} = req.params;
//bármilyen kategória név megadása esetén,amely szóközöket tartalmaz tegyen közé '-' jelet
        name = name.trim()
        const slug = name.split(' ').join('-')
 try {
  let result = null
   if (image) {
    cloudinary.config({
     cloud_name: process.env.cloud_name,
     api_key: process.env.api_key,
     api_secret: process.env.api_secret,
     secure: true
    })
     result = await cloudinary.uploader.upload(image.filepath, {folder: 'categorys'})
   } 
   const updateData = {
    name,
    slug,
   }
   if (result) {
    updateData.image = result.url
   }
   const category = await categoryModel.findByIdAndUpdate(id,updateData,{new: true})
   responseReturn(res,200,{category, message: 'Kategória sikeresen módosítva!'})
    } catch (error) {
      responseReturn(res, 500, {error: 'Belső szerverhiba!'})
    }
   }
  })
 }
//Admin - Kategória szerkesztése metódus vége
//Admin - Kategória törlése metódus
 delete_category = async(req,res) => {
    try {
      const categoryId = req.params.id
      const delete_category = await categoryModel.findByIdAndDelete(categoryId)
      if (!delete_category) {
        console.log(`Az alábbi azonosítóval kategória nem található: ${categoryId}`)
        return res.status(404).json({message: 'Nem létezik ilyen kategória'})
      }
      res.status(200).json({message: 'Kategória sikeresn törölve!'})
    } catch (error) {
        console.log(`Hiba az alábbi kategória azonosító törlésénél:`,error)
      res.status(500).json({message: 'Belső szerverhiba!'})
    }
}
//Admin - Kategória törlése metódus vége
}
module.exports = new categoryController()
