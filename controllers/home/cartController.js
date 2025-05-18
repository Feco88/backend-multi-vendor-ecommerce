const cartModel = require("../../models/cartModel")
const { responseReturn } = require("../../utilities/response")
const { mongo: {ObjectId}} = require('mongoose')
const wishlistModel = require("../../models/wishlistModel")

class cartController {
 add_to_cart = async(req, res) => {
 const { userId, productId, quantity } = req.body
  try {
    const product = await cartModel.findOne({
        $and: [{
         productId: {
          $eq: productId    
         }
        },
        {
          userId: {
            $eq: userId
          }
        }
    ]
    })
  if (product) {
    responseReturn(res,404,{error: "A termék már a Kosárban van!"})
  } else {
    const product = await cartModel.create({
     userId,
     productId,
     quantity
    })
    responseReturn(res,201,{message: "Termék sikeresen hozzáadva a Kosárhoz!",product})
    }
  } catch (error) {
    console.log(error.message)
 }
 }
//Metódus vége
get_cart_products = async(req, res) => {
//kezelési költség beállítása (commission = 5%)
  const co = 5;
  const {userId} = req.params
  try {
    const cart_products = await cartModel.aggregate([{
      $match: {
        userId: {
          $eq: new ObjectId(userId)
        }
      }
    },
  //összekapcsolás $lookup-al (from: táblanév), (localField: mezőnév)
  //(foreignField: másik táblában szereplő mező), (as: az egyesített tábla neve)
    {
      $lookup: {
        from: 'products',
        localField: 'productId',
        foreignField: '_id',
        as: 'products'
      }
    }
  ])

  let buy_product_item = 0;
  let calculatePrice = 0;
  let cart_product_count = 0;
 //készleten található termék mennyiségének lekérése
  const outOfStockProduct = cart_products.filter(p => p.products[0].stock < p.quantity)
 //fussunk végig az összes terméken for-ciklussal
  for (let i = 0; i < outOfStockProduct.length; i++) {
   cart_product_count = cart_product_count + outOfStockProduct[i].quantity
  }
  const stockProduct = cart_products.filter(p => p.products[0].stock >= p.quantity)
  for (let i = 0; i < stockProduct.length; i++) {
  const {quantity} = stockProduct[i]
   cart_product_count = buy_product_item + quantity
 //megvásárolható termékek száma
   buy_product_item = buy_product_item + quantity
 //ár kiszámítása, ha van kedvezmény a terméken
  const { price, discount } = stockProduct[i].products[0]
  if (discount !== 0) {
   calculatePrice = calculatePrice + quantity * (price - Math.floor((price * discount) / 100))
  } else {
 //ár kiszámítása, ha nincs kedvezmény
   calculatePrice = calculatePrice + quantity * price
  }
 }
//ciklus vége
//termékek megjelenésének formátuma eladónként
 let p = []
 let unique = [...new Set(stockProduct.map(p => p.products[0].sellerId.toString()))]
 for (let i = 0; i < unique.length; i++) {
 let price = 0;
//az eladóhoz, ha több termék tartozik, akkor jelenítse meg azokat is
  for (let j = 0; j < stockProduct.length; j++) {
   const tempProduct = stockProduct[j].products[0]
//ha a terméknek van kedvezményes ára, akkor jelenítse meg azt is,
//ha nincs kedvezmény rajta, akkor ne jelenjen meg a kedvezmény
   if (unique[i] === tempProduct.sellerId.toString()) {
//pri az összértéke a kosárban lévő termékeknek
    let pri = 0;
    if (tempProduct.discount !== 0) {
      pri = tempProduct.price - Math.floor((tempProduct.price * tempProduct.discount) / 100)
    } else {
      pri = tempProduct.price
    }
//kezelési költség kiszámítása az admin részére
  pri = pri - Math.floor((pri * co) / 100)
  price = price + pri * stockProduct[j].quantity
  p[i] = {
    sellerId: unique[i],
    shopName: tempProduct.shopName,
    price,
    products: p[i] ? [
      ...p[i].products,
      {
        _id: stockProduct[j]._id,
        quantity: stockProduct[j].quantity,
        productInfo: tempProduct
      }
    ] : [{
        _id: stockProduct[j]._id,
        quantity: stockProduct[j].quantity,
        productInfo: tempProduct
     }]
    }
   }
  }
 }
  responseReturn(res,200,{
    cart_products: p,
    price: calculatePrice,
    cart_product_count,
//szállítási költség 1500,-Ft és 
//kiszámítása (szorozva eladók számával: p.length)
    shipping_fee: 1500 * p.length,
    outOfStockProduct,
    buy_product_item
  })
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége
delete_cart_products = async (req,res) => {
  const {cart_id} = req.params
  try {
    await cartModel.findByIdAndDelete(cart_id)
    responseReturn(res,200,{message: "Termék sikeresen eltávolítva a Kosárból!"})
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége
quantity_inc = async (req,res) => {
  const {cart_id} = req.params
  try {
    const product = await cartModel.findById(cart_id)
    const {quantity} = product
    await cartModel.findByIdAndUpdate(cart_id,{quantity: quantity + 1})
    responseReturn(res,200,{message:"Mennyiség sikeresen frissítve!"})
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége
quantity_dec = async (req,res) => {
  const {cart_id} = req.params
  try {
    const product = await cartModel.findById(cart_id)
    const {quantity} = product
    await cartModel.findByIdAndUpdate(cart_id,{quantity: quantity - 1})
    responseReturn(res,200,{message:"Mennyiség sikeresen frissítve!"})
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége

add_wishlist = async (req,res) =>{
  const { slug } = req.body
  try {
    const product = await wishlistModel.findOne({slug})
     if (product) {
      responseReturn(res,404,{
        error: 'A termék már szerepel a Kedvencek listáján!'
      })
     } else {
      await wishlistModel.create(req.body)
      responseReturn(res,201,{
        message: 'Termék sikeresen hozzáadva a Kedvencekhez!'
      })
     }
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége

get_wishlist = async (req,res) =>{
  const {userId} = req.params
  try {
    const wishlists = await wishlistModel.find({
      userId
    })
    responseReturn(res,200, {
      wishlistCount: wishlists.length,
      wishlists
    })
  } catch (error) {
    console.log(error.message)
  }
}
//Metódus vége

remove_wishlist = async (req, res) => {
  const {wishlistId} = req.params
  try {
   const wishlist = await wishlistModel.findByIdAndDelete(wishlistId) 
   responseReturn(res, 200,{
       message: 'Termék sikeresen eltávolítva a Kedvencekből!',
       wishlistId
   })
  } catch (error) {
   console.log(error.message)
  }
}
//Metódus vége
}
module.exports = new cartController()