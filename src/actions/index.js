import API from '../constants/api';
import store from '../store';
import { showLoading, hideLoading, resetLoading } from 'react-redux-loading-bar'

export const actionShowLoading = () => { return (dispatch) => dispatch(showLoading()) }
export const actionHideLoading = () => { return (dispatch) => dispatch(hideLoading()) }
export const actionResetLoading = () => { return (dispatch) => dispatch(resetLoading()) }

export const tray_auth = () => {
    let data = {
        code: process.env.REACT_APP_TRAY_CODE,
        consumer_key: process.env.REACT_APP_TRAY_CONSUMER_KEY,
        consumer_secret: process.env.REACT_APP_TRAY_CONSUMER_SECRET_KEY
    };

    return (dispatch) => {
        return API.post(`auth`, data)
            .then(response => {
                let { code } = response.data;
                if (code === 200 || code === 201)
                    dispatch(tray_auth_success(response.data))
                else if (code === 401)
                    dispatch(tray_auth_refresh(response.data))
            })
            .catch(error => {
                dispatch(tray_auth_failure(error));
            });
    }
}

export const tray_auth_refresh = (data) => {
    return (dispatch) => {
        return API.get(`auth?refresh_token=${data.refresh_token}`)
            .then(response => {
                dispatch(tray_auth_success(response.data))
            })
            .catch(error => {
                dispatch(tray_auth_failure(error));
            });
    }
}

export const TRAY_AUTH_SUCCESS = 'TRAY_AUTH_SUCCESS';
export const tray_auth_success = (data) => {
    return {
        type: TRAY_AUTH_SUCCESS,
        data
    }
}

export const TRAY_AUTH_FAILURE = 'TRAY_AUTH_FAILURE';
export const tray_auth_failure = (error) => {
    return {
        type: TRAY_AUTH_FAILURE,
        error
    }
}

/*
    GET - Retrieve product informations 
    require access_token and product reference
*/
const limit = 50; //Retrieve 50 products per page
export const tray_get_product = (reference, pageNumber) => {
    let access_token = store.getState().trayApiState.auth.access_token;
    let url = `products/?access_token=${access_token}`;

    let url_get_page = Number.isInteger(pageNumber) ?
        `${url}&page=${pageNumber}&limit=${limit}` : null;
    let url_get_single = Number.isInteger(reference) ? `${url}&reference=${reference}` : null;

    url = (url_get_page !== null) ? url_get_page : url_get_single;

    return (dispatch) => {
        dispatch(showLoading())
        return API.get(url)
            .then((productResponse) => {
                let productsArray = productResponse.data.Products;
                let variantPromiseArray = productsArray.map(({ Product } = productsArray) => {
                    let variantArray = Product.Variant

                    if (variantArray.length > 0) {
                        return Promise.all(
                            variantArray.map(variant => {
                                return dispatch(tray_get_product_variant(variant.id))
                            })
                        );
                    }
                    return null;
                })

                let flattenVariantArray = Promise.all(variantPromiseArray).then(solvedVariantsPromiseArray => {
                    return solvedVariantsPromiseArray.map((solvedVariants) => {
                        return (
                            solvedVariants !== null ? solvedVariants.map(variant => {
                                return variant.data.Variants[0].Variant
                            }) : []
                        )
                    })
                });

                return flattenVariantArray.then(variantArray => {
                    let mergedProductResponse = productResponse;
                    variantArray.map((variants, i) =>
                        mergedProductResponse.data.Products[i].Product.Variant = variants
                    )
                    return mergedProductResponse;
                })
            })
            .catch((error) => {
                return error
            })
    }
}

export const TRAY_GET_PRODUCT_SUCCESS = 'TRAY_GET_PRODUCT_SUCCESS';
export const tray_get_product_success = (data) => {
    return {
        type: TRAY_GET_PRODUCT_SUCCESS,
        data
    }
}

export const TRAY_GET_PRODUCT_FAILURE = 'TRAY_GET_PRODUCT_FAILURE';
export const tray_get_product_failure = (error) => {
    return {
        type: TRAY_GET_PRODUCT_FAILURE,
        error
    }
}

export const tray_get_product_variant = (variantId) => {
    let access_token = store.getState().trayApiState.auth.access_token;
    let url = `products/variants/?access_token=${access_token}&id=${variantId}`;

    return (dispatch) => {
        dispatch(showLoading())
        return API.get(url);
    }
}

/*PUT - Refreshing product 
    require access_token and product id
*/
export const tray_refresh_product = (product) => {
    let access_token = store.getState().trayApiState.auth.access_token;
    let variantArray = product.Variant;
    let noVariant = variantArray.length === 0 ? true : false;
    let url = `products/${product.id}?access_token=${access_token}`;

    let promiseArray = variantArray.map(variant => {
        return tray_refresh_product_variant(variant)
    })

    return (dispatch) => {
        dispatch(showLoading())
        return API.put(url, { stock: product.stock })
            .then(response => {
                if (noVariant) 
                    return response
                else {
                    promiseArray.unshift(Promise.resolve(response))
                    return Promise.all(promiseArray);
                }
            })
            .catch(error => {
                error.response = error.response ?
                                 error.response :
                                 {data:{message: "error", code: 400, id: product.id}, statusText: "LIMIT REACHED"}
                if (noVariant) 
                    return error.response
                else {
                    promiseArray.unshift(Promise.resolve(error.response))
                    return Promise.all(promiseArray);
                }
            });
    }
}

export const TRAY_REFRESH_PRODUCT_SUCCESS = 'TRAY_REFRESH_PRODUCT_SUCCESS';
export const tray_refresh_product_success = (data) => {
    return {
        type: TRAY_REFRESH_PRODUCT_SUCCESS,
        data
    }
}

export const TRAY_REFRESH_PRODUCT_FAILURE = 'TRAY_REFRESH_PRODUCT_FAILURE';
export const tray_refresh_product_failure = (error) => {
    return {
        type: TRAY_REFRESH_PRODUCT_FAILURE,
        error
    }
}

/* PUT - Refresh one Variant from some product */
export const tray_refresh_product_variant = (variant) => {
    let access_token = store.getState().trayApiState.auth.access_token;
    let url = `products/variants/${variant.id}?access_token=${access_token}`;
    return API.put(url, { stock: variant.stock })
        .then(response => response)
        .catch(error => {
            return error.response ? error.response : {data:{message: "error", code: 400, id: variant.id}, statusText: "LIMIT REACHED"}
        })
}

/* PUT - Refresh All Products */
export const tray_refresh_all_products = (arrayOfProducts) => {
    return dispatch => Promise.all(
        arrayOfProducts.map(({ Product }) => {
            return dispatch(tray_refresh_product(Product))
        })
    ).then(response => {
        dispatch(tray_refresh_all_product_success(response))
        dispatch(resetLoading())
    }).catch(error => {
        dispatch(tray_refresh_all_product_failure(error))
        dispatch(resetLoading())
    });
}

export const TRAY_REFRESH_ALL_PRODUCT_SUCCESS = 'TRAY_REFRESH_ALL_PRODUCT_SUCCESS';
export const tray_refresh_all_product_success = (data) => {
    return {
        type: TRAY_REFRESH_ALL_PRODUCT_SUCCESS,
        data
    }
}

export const TRAY_REFRESH_ALL_PRODUCT_FAILURE = 'TRAY_REFRESH_ALL_PRODUCT_FAILURE';
export const tray_refresh_all_product_failure = (data) => {
    return {
        type: TRAY_REFRESH_ALL_PRODUCT_FAILURE,
        data
    }
}

/*GET
 TRAY RETIREVE ALL PRODUCTS AVAIABLE
*/
export const tray_get_all_products = (arrayOfPagesNumbers) => {
    return dispatch => Promise.all(
        arrayOfPagesNumbers.map((currentPage) => {
            return dispatch(tray_get_product(null, currentPage))
        })
    );
}

export const TRAY_GET_ALL_PRODUCTS_SUCCESS = 'TRAY_GET_ALL_PRODUCTS_SUCCESS';
export const tray_get_all_products_success = (data) => {
    return {
        type: TRAY_GET_ALL_PRODUCTS_SUCCESS,
        data
    }
}

export const TRAY_GET_ALL_PRODUCTS_FAILURE = 'TRAY_GET_ALL_PRODUCTS_FAILURE';
export const tray_get_all_products_failure = (data) => {
    return {
        type: TRAY_GET_ALL_PRODUCTS_FAILURE,
        data
    }
}

// Saving All the uploaded products iside the store
export const SAVE_UPLOADED_PRODUCTS = 'SAVE_UPLOADED_PRODUCTS';
export const save_uploaded_products = (data) => {
    return {
        type: SAVE_UPLOADED_PRODUCTS,
        data
    }
}