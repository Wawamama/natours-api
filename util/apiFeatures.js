class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    // FILTERING lethod
    filter() {
        
        const queryObj = {...this.queryString}
        const excludedFields = ['page', 'sort', 'limit', 'fields'] // fields we'll use for sorting, pagination and field limiting
        excludedFields.forEach(field => delete queryObj[field])
        // 1B. ADVANCED FILTERING (greater or smaller than...)
        // In the request we use [gte] and it returns : { duration: { gte: '5' }, difficulty: 'easy' }
        // We want the same thing but with the '$' operator for mongodb -> { duration: { $gte: '5' }, difficulty: 'easy' }
        // So we want to replace gte, gt, lte and lt 
        let queryString = JSON.stringify(queryObj);
        queryString = queryString.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`)

        this.query = this.query.find((JSON.parse(queryString)))

        return this
    }
    // SORTING method
    sort() {
        if(this.queryString.sort) {
            const sortBy = this.queryString.sort.split(',').join(' ')
            // in case of tie we can add a second criteria : sort('price ratingsAverage)
            this.query = this.query.sort(sortBy)   
        } else {
            this.query = this.query.sort('-createdAt')
        }

        return this
    }

    // LIMIT FIELDS method (we don't want to send back all the data everytime => bande passante)
    limitFields() {
        if(this.queryString.fields) {
            const fields = this.queryString.fields.split(',').join(' ')
            // what we want : finalQuery.select('name duration price')
            this.query = this.query.select(fields)
        } else {
            this.query = this.query.select('-__v') // exclude the field '__v' automatically added by mongo
        }

        return this
    }

    // PAGINATION method (we don't want to show ALL the results)
        // exemple de query pour afficher la page 2 et 10 resultats par page : 
        // page=2&limit=10 ==> 1-10 on page 1, 11-20 on page 2, 21-30 on page 3 ...
        // we need to skip 10 results to see page 2 :
        // finalQuery = finalQuery.skip(10).limit(10)
    paginate() {
        const page = this.queryString.page * 1 || 1 // converts string to number, default page = 1
        const limit = this.queryString.limit * 1 || 100 // default limit = 100 
        const skip = (page -1) * limit
        this.query = this.query.skip(skip).limit(limit)
        
        return this
    }
}

module.exports = APIFeatures;