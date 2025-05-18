const categoryModel = require('../../models/categoryModel')
const productModel = require('../../models/productModel')
const reviewModel = require('../../models/reviewModel')
const { responseReturn } = require("../../utilities/response")
const queryProducts = require('../../utilities/queryProducts')
const moment = require('moment')
const { mongo: {ObjectId}} = require('mongoose')

class homeControllers{

 formateProduct = (products) => {
 const productArray = [];
  let i = 0;
    while (i < products.length ) {
     let temp = []
     let j = i
      while (j < i + 3) {
        if (products[j]) {
         temp.push(products[j])
        }
        j++
      }
    productArray.push([...temp])
     i = j
    }
  return productArray
 }

    get_categorys = async(req,res) => {
        try {
            const categorys = await categoryModel.find({})
            responseReturn(res,200, {
                categorys
            })
            
        } catch (error) {
            console.log(error.message)
        }
    }
//get_categorys metódus vége
//get_products metódus eleje
    get_products = async(req, res) => {
        try {
            const products = await productModel.find({}).limit(12).sort({
                createdAt: -1
            })
            const allProduct1 = await productModel.find({}).limit(9).sort({
                createdAt: -1
            })
            const latest_product = this.formateProduct(allProduct1);
            
            const allProduct2 = await productModel.find({}).limit(9).sort({
                rating: -1
            })
            const topRated_product = this.formateProduct(allProduct2);
           
            const allProduct3 = await productModel.find({}).limit(9).sort({
                discount: -1
            })
            const discount_product = this.formateProduct(allProduct3);

            responseReturn(res, 200,{
                products,
                latest_product,
                topRated_product,
                discount_product
            })
            
        } catch (error) {
            console.log(error.message)
        }
    }
//get_products metódus vége
//price_range_product metódus eleje
   price_range_product = async (req, res) => {
    try {
        const priceRange = {
            low: 0,
            high: 0,
        }
        const products = await productModel.find({}).limit(9).sort({
            createdAt: -1 // 1 for asc -1 is for Desc
        })
        const latest_product = this.formateProduct(products);
        const getForPrice = await productModel.find({}).sort({
            'price': 1
        })
        if (getForPrice.length > 0) {
            priceRange.high = getForPrice[getForPrice.length - 1].price
            priceRange.low = getForPrice[0].price
        }
        responseReturn(res, 200, {
            latest_product,
            priceRange
        })
        
    } catch (error) {
        console.log(error.message)
    }

   }
//price_range_product metódus vége
//query_products metódus eleje
query_products = async (req, res) => {
    const parPage = 12
    req.query.parPage = parPage
    try {
        const products = await productModel.find({}).sort({createdAt: -1})
        const totalProduct = new queryProducts(products, req.query).categoryQuery().ratingQuery().priceQuery().searchQuery().sortByPrice().countProducts();
        const result = new queryProducts(products, req.query).categoryQuery().ratingQuery().priceQuery().searchQuery().sortByPrice().skip().limit().getProducts();
        responseReturn(res, 200, {
            products: result,
            totalProduct,
            parPage
        })
    } catch (error) {
        console.log(error.message)
    }
}
//termékadatok metódus
 product_details = async(req,res) => {
  const {slug} = req.params
   try {
    const product = await productModel.findOne({slug})
//kapcsolódó termékek megjelenítése - termékhez tartozó kategórián belül
  const relatedProducts = await productModel.find({
   $and: [{
    _id: {
      $ne: product.id //nem egyenlő a megjelenített termék Id-val
      }
    },
    {
     category: {
      $eq: product.category //kategórián belüli további termékek megjelenítése
    }
    }
   ]
  }).limit(12) //12 termék jelenik meg max. kapcsolódóként a kategórián belül
//adott bolthoz kapcsolódó termékek
  const moreProducts = await productModel.find({
    $and: [{
      _id: {
        $ne: product.id
        }
    },
    {
    sellerId: {
        $eq: product.sellerId
     }
    }
   ]
  }).limit(3) //3 termék jelenik meg az adott bolthoz kapcsolódóan
  responseReturn(res,200, {
    product,
    relatedProducts,
    moreProducts
  })
  } catch (error) {
    console.log(error.message)
    }
 }
//termékadatok metódus vége
//termék értékelések metódus
submit_review = async(req,res) => {
 const {productId, rating, review, name} = req.body
 //mezők hozzáadása a 'reviews' táblához
 try {
   await reviewModel.create({
    productId,
    name,
    rating,
    review,
    date: moment(Date.now()).locale('hu').format('LL')
   })
 //értékelések kiszámítása
 let rat = 0;
 const reviews = await reviewModel.find({
    productId
 })
 for (let i = 0; i < reviews.length; i++) {
    rat = rat + reviews[i].rating
 }
 let productRating = 0
 if (reviews.length !== 0) {
    productRating = (rat / reviews.length).toFixed(1)
 }
 //frissítjük az adatokat a 'products' táblában
 await productModel.findByIdAndUpdate(productId,{
    rating : productRating
 })
 responseReturn(res, 201, {
    message: "Értékelés sikeresen beküldve!"
 })
 } catch (error) {
   console.log(error.message)
 }
}
//termék értékelések metódus vége
//termék értékelésének megjelenítése metódus
get_reviews = async (req,res) => {
 const {productId} = req.params
 let {pageNo} = req.query
 pageNo = parseInt(pageNo)
 //mennyi értékelés jelenjen meg egy oldalon
 const limit = 5
 const skipPage = limit * (pageNo - 1)

 try {
 //értékelések kiolvasása az adatbázisból
    let getRating = await reviewModel.aggregate([{
     $match: {
      productId: {
        $eq: new ObjectId(productId)
      },
      rating: {
       $not: {
        $size: 0
       }
      }
     }
    },
    {
     $unwind: "$rating"
    },
    {
     $group: {
        _id: "$rating",
        count: {
            $sum: 1
        }
     }
    }
]
)
//értékelések 1-5-ig
 let rating_review = [{
    rating: 5,
    sum: 0
 },
 {
    rating: 4,
    sum: 0
 },
 {
    rating: 3,
    sum: 0
 },
 {
    rating: 2,
    sum: 0
 },
 {
    rating: 1,
    sum: 0
 }
]
//értékelések kiszámítása a megjelenítéshez
for (let i = 0; i < rating_review.length; i++) {
    for (let j = 0; j < getRating.length; j++) {
      if (rating_review[i].rating === getRating[j]._id) {
        rating_review[i].sum = getRating[j].count
        break
      }        
    }
}
//adatok kinyerése
const getAll = await reviewModel.find({
    productId
})
const reviews = await reviewModel.find({
    productId
}).skip(skipPage).limit(limit).sort({createAt: -1})
responseReturn(res, 200, {
    reviews,
    totalReview: getAll.length,
    rating_review
})
 } catch (error) {
  console.log(error.message)
 }
}
//termék értékelésének megjelenítése metódus vége
}

module.exports = new homeControllers()