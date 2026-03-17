// src-tauri/src/lan_sync.rs
// LAN Real-Time Sync Server using embedded HTTP server

use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

static SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LanServerStatus {
    pub running: bool,
    pub port: u16,
    pub connected_clients: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LanOrder {
    pub id: String,
    pub items: Vec<LanOrderItem>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total: f64,
    pub payment_method: String,
    pub customer_name: String,
    pub status: String,
    pub order_type: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LanOrderItem {
    pub product_id: String,
    pub product_name: String,
    pub price: f64,
    pub quantity: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LanSyncRequest {
    pub device_id: String,
    pub orders: Vec<LanOrder>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LanSyncResponse {
    pub success: bool,
    pub message: String,
    pub orders: Option<Vec<LanOrder>>,
}

pub fn is_server_running() -> bool {
    SERVER_RUNNING.load(Ordering::SeqCst)
}

pub async fn start_lan_server(port: u16) -> Result<(), String> {
    if SERVER_RUNNING.load(Ordering::SeqCst) {
        return Err("Server already running".to_string());
    }

    SERVER_RUNNING.store(true, Ordering::SeqCst);

    let addr = format!("0.0.0.0:{}", port);
    
    tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
        eprintln!("[LAN Sync] Server started on {}", addr);

        while SERVER_RUNNING.load(Ordering::SeqCst) {
            match listener.accept().await {
                Ok((socket, addr)) => {
                    eprintln!("[LAN Sync] Client connected: {}", addr);
                    tokio::spawn(handle_client(socket));
                }
                Err(e) => {
                    eprintln!("[LAN Sync] Accept error: {}", e);
                }
            }
        }
        
        eprintln!("[LAN Sync] Server stopped");
    });

    Ok(())
}

pub fn stop_lan_server() -> Result<(), String> {
    if !SERVER_RUNNING.load(Ordering::SeqCst) {
        return Err("Server not running".to_string());
    }
    
    SERVER_RUNNING.store(false, Ordering::SeqCst);
    Ok(())
}

async fn handle_client(mut socket: tokio::net::TcpStream) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    
    let mut buffer = [0u8; 8192];
    
    match socket.read(&mut buffer).await {
        Ok(0) => return,
        Ok(n) => {
            let request = String::from_utf8_lossy(&buffer[..n]);
            eprintln!("[LAN Sync] Received: {}", request);
            
            let response = r#"{"success":true,"message":"OK"}"#;
            
            let http_response = format!(
                "HTTP/1.1 200 OK\r\n\
                Content-Type: application/json\r\n\
                Content-Length: {}\r\n\
                Access-Control-Allow-Origin: *\r\n\
                \r\n\
                {}",
                response.len(),
                response
            );
            
            if let Err(e) = socket.write_all(http_response.as_bytes()).await {
                eprintln!("[LAN Sync] Write error: {}", e);
            }
        }
        Err(e) => {
            eprintln!("[LAN Sync] Read error: {}", e);
        }
    }
}

pub fn broadcast_order(_order: &super::db::Order) {
    if !SERVER_RUNNING.load(Ordering::SeqCst) {
        return;
    }
    // In a full implementation, this would broadcast to connected clients
    eprintln!("[LAN Sync] Broadcasting order to clients");
}
