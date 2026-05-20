import { Routes, Route } from "react-router-dom";

import Login from "./pages-user/Login";
import Signup from "./pages-user/Signup";

import Dashboard from "./pages-user/Dashboard";
import MyCart from "./pages-user/MyCart";
import MyAccount from "./pages-user/MyAccount";
import OrderManagement from "./pages-user/OrderManagement";
import Checkout from "./pages-user/Checkout";

import AdminDashboard from "./pages-admin/AdminDashboard1";
import AddProduct from "./pages-admin/AddProduct";
import ProductList from "./pages-admin/ProductList";
import EditProduct from "./pages-admin/EditProduct";
import Orderdetailspage from "./pages-admin/Orderdetailspage";

import ProtectedRoute from "./ProtectedRoute";
import UserLayout from "./layouts/UserLayout";
import AdminLayout from "./layouts/AdminLayout";

function App() {
  return (
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* USER ROUTES */}
      <Route
        path="/"
        element={
          <ProtectedRoute role="user">
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="mycart" element={<MyCart />} />
        <Route path="myaccount" element={<MyAccount />} />
        <Route path="ordermanagement" element={<OrderManagement />} />
        <Route path="checkout" element={<Checkout />} />
      </Route>

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="addproduct" element={<AddProduct />} />
        <Route path="productlist" element={<ProductList />} />
        <Route path="editproduct/:id" element={<EditProduct />} />
        <Route path="orderdetails" element={<Orderdetailspage />} />
      </Route>

    </Routes>
  );
}

export default App;