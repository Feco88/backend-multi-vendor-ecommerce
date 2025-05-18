const formidable = require("formidable")
const { responseReturn } = require("../../utilities/response")
const cloudinary = require('cloudinary').v2
const sellerModel = require('../../models/sellerModel')

class sellerController {

//Eladói kérések metódus
request_seller_get = async(req, res) => {
    const {page,searchValue,parPage} = req.query
    const skipPage = parseInt(parPage) * (parseInt(page) - 1)
    try {
        if (searchValue) {
            
        } else {
        //eladói adatok (függőben lévő eladóknál) kinyerése adatbázisból
        const sellers = await sellerModel.find({status: 'pending'}).sort({ createdAt:-1})
        const totalSeller = await sellerModel.find({status: 'pending'}).countDocuments()
        responseReturn(res,200,{sellers,totalSeller})
        }
    } catch (error) {
        responseReturn(res,500,{error: error.message})
    }
   }
//Eladói kérések metódus vége
//Eladó adatainak kiírása metódus
get_seller = async(req,res) => {
        const {sellerId} = req.params;
        try {
            const seller = await sellerModel.findById(sellerId)
            responseReturn(res,200,{seller})
        } catch (error) {
            responseReturn(res,500,{error: error.message})
        }
    }
//Eladó adatainak kiírása metódus vége

//Eladó aktiválásának/tiltásának metódus
seller_status_update = async(req,res) => {
    const {sellerId, status} = req.body;
    try {
        await sellerModel.findByIdAndUpdate(sellerId,{status})
        const seller = await sellerModel.findById(sellerId)
        responseReturn(res,200,{seller, message: 'Eladó állapota sikeresen módosítva!'})
    } catch (error) {
        responseReturn(res,500,{error: error.message})
    }
 }
//Eladó aktiválásának/tiltásának metódus vége
//Aktív Eladók megjelenítése metódus
get_active_sellers = async (req,res) => {
   let {page,searchValue,parPage} = req.query
   page = parseInt(page)
   parPage = parseInt(parPage)
  //az oldalszámozás csak akkor jelenjen meg, ha 5-nél több adat van
  const skipPage = parPage * (page - 1)
  //keresés alapján szűrje le az Eladókat
  try {
    if (searchValue) {
     const sellers = await sellerModel.find({
        $text: { $search: searchValue},
        status: 'active'
  //Aktív Eladók megjelenítése skipPage-en belül, parPage limittel és
  //létrehozás dátuma alapján csökkenő sorrendben
      }).skip(skipPage).limit(parPage).sort({createdAt : -1})
  //összes Eladó megjelenítése
     const totalSeller = await sellerModel.find({
        $text: { $search: searchValue},
        status: 'active'
      }).countDocuments()
    responseReturn(res, 200, {totalSeller,sellers})
    } else {
    const sellers = await sellerModel.find({ status: 'active'
    }).skip(skipPage).limit(parPage).sort({createdAt : -1})

     const totalSeller = await sellerModel.find({status: 'active'}).countDocuments()
     responseReturn(res, 200, {totalSeller,sellers})    
    }
  } catch (error) {
    console.log('Aktív eladó lekérése' + error.message)
  }
 }
//Aktív Eladók megjelenítése metódus vége
//Deaktív Eladók megjelenítése metódus
get_deactive_sellers = async (req,res) => {
    let {page,searchValue,parPage} = req.query
    page = parseInt(page)
    parPage = parseInt(parPage)
   //az oldalszámozás csak akkor jelenjen meg, ha 5-nél több adat van
   const skipPage = parPage * (page - 1)
   //keresés alapján szűrje le az Eladókat
   try {
     if (searchValue) {
      const sellers = await sellerModel.find({
         $text: { $search: searchValue},
         status: 'inactive'
   //Aktív Eladók megjelenítése skipPage-en belül, parPage limittel és
   //létrehozás dátuma alapján csökkenő sorrendben
       }).skip(skipPage).limit(parPage).sort({createdAt : -1})
   //összes Eladó megjelenítése
      const totalSeller = await sellerModel.find({
         $text: { $search: searchValue},
         status: 'inactive'
       }).countDocuments()
     responseReturn(res, 200, {totalSeller,sellers})
     } else {
     const sellers = await sellerModel.find({ status: 'inactive'
     }).skip(skipPage).limit(parPage).sort({createdAt : -1})
 
      const totalSeller = await sellerModel.find({status: 'inactive'}).countDocuments()
      responseReturn(res, 200, {totalSeller,sellers})    
     }
   } catch (error) {
     console.log('Deaktív eladó lekérése' + error.message)
   }
  }
 //Deaktív Eladók megjelenítése metódus vége
}

module.exports = new sellerController()
