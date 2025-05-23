class queryProducts {
    products = []
    query = {}
    constructor(products,query){
        this.products = products
        this.query = query
    }
//Kategória query hozzáadása
    categoryQuery = () => {
        this.products = this.query.category ? this.products.filter(c => c.category === this.query.category) : this.products
        return this
    }
//Értékelő query hozzáadása
    ratingQuery = () => {
        this.products = this.query.rating ? this.products.filter(c => parseInt(this.query.rating) <= c.rating && c.rating < parseInt(this.query.rating) + 1) : this.products
        return this
    }
//Kereső query hozzáadása
searchQuery = () => {
    this.products = this.query.searchValue ? this.products.filter(p => p.name.toUpperCase().indexOf(this.query.searchValue.toUpperCase()) > -1) : this.products
    return this
}
//Ár alapján történő rendezés query hozzáadása
    priceQuery = () => {
        this.products = this.products.filter(p => p.price >= this.query.lowPrice & p.price <= this.query.highPrice )
        return this
    }
    sortByPrice = () => {
        if (this.query.sortPrice) {
            if (this.query.sortPrice === 'low-to-high') {
                this.products = this.products.sort(function (a,b){ return a.price - b.price})
            } else {
                this.products = this.products.sort(function (a,b){ return b.price - a.price})
            }
        }
        return this
    }
//Maradék termék megjelenítése a következő oldalon
      skip = () => {
        let {pageNumber} = this.query
        const skipPage = (parseInt(pageNumber) - 1) * this.query.parPage
        let skipProduct = []

        for (let i = skipPage; i < this.products.length; i++) {
            skipProduct.push(this.products[i]) 
        }
        this.products = skipProduct
        return this
    }

//Limitáljuk az egyszerre megjelenő termékek számát
    limit = () => {
        let temp = []
        if (this.products.length > this.query.parPage) {
            for (let i = 0; i < this.query.parPage; i++) {
                temp.push(this.products[i]) 
            } 
        }else {
            temp = this.products
        }
        this.products = temp 
        return this
    }
//Mennyi termék jelenik meg (pl.14 termék)
    getProducts = () => {
        return this.products
    }

    countProducts = () => {
        return this.products.length
    } 

}

module.exports = queryProducts