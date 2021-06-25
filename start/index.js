let config = {
  stock_symbols: [ "XPEV", "CRSP", "NIO", "TSLA", "CSIQ", "ENPH", "UGA", "BAR", "NVDA" ],
  api_keys: {
    ipgeolocation: "3a1a3c98566b40c3855d5835ae4847ee",
  },
};

let stocks = new Stocks('SYTCQBUIU44BX2G4');
function updateStocks() {
  for(i in config.stock_symbols) {
    let stock_symbol = config.stock_symbols[i];
    stocks.timeSeries({symbol: stock_symbol, interval: "15min", amount: 1}).then(result => {
      html = '';
      html += '<div class="data-tr">';
      html += '<div class="data-td">' + stock_symbol + '</div>';
      html += '<div class="data-td">' + result[0]["close"] + '</div>';
      html += '</div>';
      $('#box-stocks').find('.data-table').append(html);
    });
  }
}

$(() => {
  updateStocks();
});
