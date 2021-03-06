const UploadFileParse = (fileContent) => {
    let numberOfLineEnd = ((fileContent.match(/~/g) || []).length);
    let numberOfSeparators = ((fileContent.match(/@/g) || []).length);

    let arrayOfProductsOnLines = fileContent.split("~").slice(0,-1);

    if (numberOfSeparators === 4 * numberOfLineEnd) {
        let arrayOfProducts = arrayOfProductsOnLines.map(lineProduct => {
            let splitedLineProducts = lineProduct.split("@");
            return {
                Product: {
                    id: splitedLineProducts[0].replace(/[\n\r]+/g, ''),
                    reference: splitedLineProducts[1],
                    name: splitedLineProducts[2],
                    stock: splitedLineProducts[3],
                    Variant: []
                }
            }
        });

        let mergedArrayOfProductsAndVariants = [];
        mergedArrayOfProductsAndVariants.push(arrayOfProducts.length > 0 ? arrayOfProducts[0] : []);
        let j = 1;
        let i = 1;
        while (i < arrayOfProducts.length-1) {
            i = j;
            mergedArrayOfProductsAndVariants.push(arrayOfProducts[i])
            j++;
            if (arrayOfProducts[i] && arrayOfProducts[j]) {
                while (arrayOfProducts[i].Product.name === arrayOfProducts[j].Product.name) {
                    mergedArrayOfProductsAndVariants[mergedArrayOfProductsAndVariants.length - 1].Product.Variant.push(arrayOfProducts[j].Product)
                    j++;
                    if(j > arrayOfProducts.length-1) break
                }
            }
            if(j > arrayOfProducts.length-1) break
        }

        return mergedArrayOfProductsAndVariants;
    }
    else {
        return null;
    }

}

export default UploadFileParse