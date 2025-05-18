const { responseReturn } = require("../../utilities/response")
const myShopWallet = require('../../models/myShopWallet')
const productModel = require('../../models/productModel')
const customerOrder = require('../../models/customerOrder')
const sellerModel = require('../../models/sellerModel')
const sellerWallet = require('../../models/sellerWallet')
const authOrder = require('../../models/authOrder')
const sellerCustomerMessage = require('../../models/chat/sellerCustomerMessage')
const adminSellerMessage = require('../../models/chat/adminSellerMessage')
const bannerModel = require('../../models/bannerModel')
const { mongo: {ObjectId}} = require('mongoose')
const cloudinary = require('cloudinary').v2
const formidable = require("formidable")

class dashboardController{
//Admin - Irányítópult főoldal összesített adatok metódus
  get_admin_dashboard_data = async(req, res) => {
    const {id} = req
  try {
   const totalSale = await myShopWallet.aggregate([
    {
     $group: {
      _id: null,
      totalAmount: {$sum: '$amount'}
     }
    }
   ])
   const totalProduct = await productModel.find({}).countDocuments()
   const totalOrder = await customerOrder.find({}).countDocuments()
   const totalSeller = await sellerModel.find({}).countDocuments()
   const messages = await adminSellerMessage.find({}).limit(3)
   const recentOrders = await customerOrder.find({}).limit(5)
   responseReturn(res,200,{
    totalProduct,
    totalOrder,
    totalSeller,
    messages,
    recentOrders,
    totalSale: totalSale.length > 0 ? totalSale[0].totalAmount : 0
   })
  } catch (error) {
    console.log(error.message)
  }
 }
//Admin - Irányítópult főoldal összesített adatok metódus vége
//Eladó - Irányítópult főoldal összesített adatok metódus
get_seller_dashboard_data = async(req,res) => {
  const {id} = req
  try {
    const totalSale = await sellerWallet.aggregate([
      {
      //a sellerId megegyezik az authMiddleWare-ből érkező id-val
      $match: {
       sellerId: {
         $eq: id
         }  
       }
       },{
         $group: {
           _id: null,
           totalAmount: {$sum: '$amount'}
         }
       }
    ])
  const totalProduct = await productModel.find({
    sellerId: new ObjectId(id)}).countDocuments()
  const totalOrder = await authOrder.find({
    sellerId: new ObjectId(id)}).countDocuments()
  const totalPendingOrder = await authOrder.find({
    $and:[
      {
        sellerId: {
          $eq: new ObjectId(id)
        }
      },
      {
        delivery_status: {
          $eq: 'függőben'
        }
      }
    ]
  }).countDocuments()
  //legutóbbi beszélgetések (Eladó-Vásárló)
  const messages = await sellerCustomerMessage.find({
    $or: [
      {
        senderId: {
          $eq: id
        }
       },{
        receiverId: {
          $eq: id
        }
      }
    ]
  }).limit(3)
  //legutóbbi rendelések
  const recentOrders = await authOrder.find({
    sellerId: new ObjectId(id)
  }).limit(5)

  responseReturn(res,200,{
    totalProduct,
    totalOrder,
    totalPendingOrder,
    messages,
    recentOrders,
    totalSale: totalSale.length > 0 ? totalSale[0].totalAmount : 0
   })

  } catch (error) {
    console.log(error.message)
  }
}
//Eladó - Irányítópult főoldal összesített adatok metódus vége
//Eladó - Hirdetés hozzáadása metódus
add_banner = async(req,res) => {
  const form = formidable({multiples:true})
  form.parse(req, async(err, field, files) => {
  const {productId} = field
  const { mainban } = files

  cloudinary.config({
    cloud_name: process.env.cloud_name,
    api_key: process.env.api_key,
    api_secret: process.env.api_secret,
    secure: true
  })
    
 try {
  const {slug} = await productModel.findById(productId) 
  const result = await cloudinary.uploader.upload(mainban.filepath, {folder: 'banners'})
  const banner = await bannerModel.create({
    productId,
    banner: result.url,
    link: slug 
  })
   responseReturn(res, 200, {banner,message: "Hirdetés sikeresen hozzáadva!"})
  } catch (error) {
    responseReturn(res, 500, { error: error.message})
  } 
   
 })
}
//Eladó - Hirdetés hozzáadása metódus vége
//Eladó - Hirdetés megjelenítése metódus
get_banner = async(req,res) => {
  const {productId} = req.params
  try {
    const banner = await bannerModel.findOne({productId: new ObjectId(productId)})
    responseReturn(res,200,{banner})
  } catch (error) {
    responseReturn(res, 500, { error: error.message})
  }
}
//Eladó - Hirdetés megjelenítése metódus vége
//Eladó - Hirdetés cseréje metódus
update_banner = async(req,res) => {
  const {bannerId} = req.params
  const form = formidable({})

  form.parse(req,async(err,_,files)=> {
    const {mainban} = files
    cloudinary.config({
      cloud_name: process.env.cloud_name,
      api_key: process.env.api_key,
      api_secret: process.env.api_secret,
      secure: true
    })
    try {
      let banner = await bannerModel.findById(bannerId)
      let temp = banner.banner.split('/')
      temp = temp[temp.length - 1]
      const imageName = temp.split('.')[0]
    //előzőleg feltöltött hirdetés képét töröljük
      await cloudinary.uploader.destroy(imageName)
    //frissítjük az új képpel
      const {url} = await cloudinary.uploader.upload(mainban.filepath, {folder: 'banners'})
      await bannerModel.findByIdAndUpdate(bannerId,{banner:url})
      banner = await bannerModel.findById(bannerId)
      responseReturn(res,200, {banner, message: "Hirdetés sikeresen módosítva!"})
    } catch (error) {
      responseReturn(res, 500, { error: error.message})
    }
  })
}
//Eladó - Hirdetés cseréje metódus vége
//Vásárló - Banner megjelenítése a Főoldalon metódus
get_banners = async(req,res) => {
  try {
    const banners = await bannerModel.aggregate([
     {
     //véletlenszerűen választjuk ki a képeket a banner táblából (jelen esetben 5-öt max.)
      $sample: {
        size: 5
      }
     }
    ])
    responseReturn(res,200,{banners})
  } catch (error) {
    responseReturn(res, 500, { error: error.message})   
  }
}
//Vásárló - Banner megjelenítése a Főoldalon metódus vége
}

module.exports = new dashboardController()