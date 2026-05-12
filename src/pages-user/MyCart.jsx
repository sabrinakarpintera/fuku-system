import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./style/MyCart.css";

function MyCart(){

  const navigate = useNavigate();

  const [items,setItems] = useState([]);
  const [checked,setChecked] = useState([]);

  useEffect(()=>{
    fetch("http://localhost/Fuku/src/api/get_cart.php", {
      credentials: "include"
    })
    .then(res=>res.json())
    .then(data=>{
      setItems(data);
      setChecked(data.map(()=>false));
    });
  },[]);

  const toggleOne=(i)=>{
    setChecked(checked.map((v,idx)=>idx===i?!v:v));
  };

  const allChecked = checked.length > 0 && checked.every(Boolean);

  const toggleAll=()=>{
    setChecked(checked.map(()=>!allChecked));
  };

  const updateQuantity = (i, value) => {
    const newItems = [...items];
    const item = newItems[i];   
    if (value < 1) value = 1;
    if (value > item.stocks) value = item.stocks;
    item.quantity = value;
    setItems(newItems);
  };

  const deleteItems=async()=>{
    const selectedIds = items
      .filter((item,i)=>checked[i])
      .map(item=>item.id);

    if(selectedIds.length === 0){
      alert("Select item to delete");
      return;
    }

    await fetch("http://localhost/Fuku/src/api/delete_cart.php", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      credentials: "include", 
      body:JSON.stringify({ids:selectedIds})
    });

    const remainingItems = items.filter((item,i)=>!checked[i]);
    setItems(remainingItems);
    setChecked(remainingItems.map(()=>false));
  };

  const subtotal = items.reduce((total,item,i)=>{
    if(checked[i]){
      return total + (item.price * item.quantity);
    }
    return total;
  },0);

  return(
    <div className="cart-container">

      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/dashboard")} aria-label="Back to dashboard">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="cart-title">My Cart</h1>
      </div>

      <div className="cart-header">
        <span></span>
        <span className="product-col">Product</span>
        <span>Price</span>
        <span>Quantity</span>
        <span>Total</span>
      </div>

      <hr/>

      {items.map((item,i)=>(
        <div key={item.id}>
          <div className="cart-item">
            <input
              type="checkbox"
              className="item-check"
              checked={checked[i] || false}
              onChange={()=>toggleOne(i)}
            />
            <div className="product-info1">
              <img
                src={`http://localhost/Fuku/src/api/${item.image}`}
                alt="product"
                className="product-img1"
              />
              <div>
                <h3>{item.name}</h3>
                <p>Color: {item.color}</p>
                <p>Size: {item.size}</p>
              </div>
            </div>
            <div className="price">₱{item.price}</div>
            <div className="quantity">
              <input
                type="number"
                min="1"
                max={item.stocks}
                value={item.quantity}
                onChange={(e) => updateQuantity(i, Number(e.target.value))}
              />
            </div>
            <div className="total">₱{item.price * item.quantity}</div>
          </div>
          <hr/>
        </div>
      ))}

      <div className="cart-footer">
        <div className="select-all">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
          />
          <span>Select All</span>
        </div>
        <div className="delete-btn" onClick={deleteItems}>Delete</div>
        <div className="subtotal">
          Subtotal: <span>₱{subtotal}</span>
        </div>
        <button
          className="checkout-btn"
          onClick={() => {
            const selectedItems = items
              .filter((item, i) => checked[i])
              .map(item => item.id);

            if (selectedItems.length === 0) {
              alert("Select items first");
              return;
            }

            navigate("/checkout", { state: { ids: selectedItems } });
          }}
        >
          Checkout
        </button>
      </div>

    </div>
  );
}

export default MyCart;