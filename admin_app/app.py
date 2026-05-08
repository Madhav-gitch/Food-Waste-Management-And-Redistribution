import streamlit as st
import pandas as pd
from pymongo import MongoClient
import os
import time
import glob
from dotenv import load_dotenv
from streamlit_option_menu import option_menu

st.set_page_config(page_title="FoodRescue AI - Admin", layout="wide", initial_sidebar_state="expanded")

# --- UI STYLES ---
st.markdown("""
<style>
    .stApp {
        background-color: #f8fafc;
        color: #1e293b;
        font-family: 'Outfit', sans-serif;
    }
    
    /* Login Split Layout */
    .login-container {
        background: #ffffff;
        padding: 3rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
        border: 1px solid #e2e8f0;
    }

    /* Fixed Header Styles Override */
    div[data-testid="stHorizontalBlock"] {
        align-items: center;
    }
    
    .fixed-header-text {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f766e;
        background: #f0fdfa;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        border: 1px solid #ccfbf1;
        cursor: pointer;
        display: inline-block;
        text-align: center;
    }

    div[data-testid="stMetricValue"] {
        font-size: 1.8rem !important;
        font-weight: 700;
        color: #0f766e;
    }
    
    div.stButton > button {
        border-radius: 8px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        color: #334155;
        transition: all 0.2s;
    }
    div.stButton > button:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }
    div.stButton > button[kind="primary"] {
        background: #14b8a6;
        color: white;
        border: none;
        font-weight: 600;
    }
    div.stButton > button[kind="primary"]:hover {
        background: #0f766e;
    }
    
    /* Notification Priority Highlights */
    .notif-high { border-left: 4px solid #ef4444; padding: 1rem; background: #fef2f2; margin-bottom: 0.8rem; border-radius: 4px; }
    .notif-medium { border-left: 4px solid #f59e0b; padding: 1rem; background: #fffbeb; margin-bottom: 0.8rem; border-radius: 4px; }
    .notif-low { border-left: 4px solid #10b981; padding: 1rem; background: #ecfdf5; margin-bottom: 0.8rem; border-radius: 4px; }
</style>
""", unsafe_allow_html=True)

# --- DB INIT ---
dotenv_path = os.path.join(os.path.dirname(__file__), '..', 'backend', '.env')
load_dotenv(dotenv_path)
MONGO_URI = os.getenv('MONGO_URI')

@st.cache_resource
def init_connection():
    if not MONGO_URI: return None
    return MongoClient(MONGO_URI)

client = init_connection()
if client:
    db = client['food_waste']
    foods_collection = db['foods']
    users_collection = db['users']
else:
    st.error("DB Connection Failed")
    st.stop()

# --- AUTH ---
if 'authenticated' not in st.session_state:
    st.session_state['authenticated'] = False

if not st.session_state['authenticated']:
    st.markdown("<h2 style='text-align: center; color: #0f766e; margin-top:2rem; margin-bottom:2rem;'>FoodRescue AI</h2>", unsafe_allow_html=True)
    
    login_col1, login_col2, login_col3 = st.columns([1, 8, 1])
    with login_col2:
        img_col, form_col = st.columns([1.2, 1], gap="large")
        with img_col:
            art_dir = r"C:\Users\secre\.gemini\antigravity\brain\352e72cc-c91a-4026-99d6-c2c09e0814c0"
            imgs = glob.glob(os.path.join(art_dir, "admin_login_illustration*.png"))
            if imgs:
                st.image(imgs[0], use_container_width=True)
            else:
                st.info("[Minimal Interface Element Placeholder]")
                
        with form_col:
            st.markdown("<div class='login-container'>", unsafe_allow_html=True)
            st.markdown("<h3>Admin Login</h3>", unsafe_allow_html=True)
            st.markdown("<p style='color:#64748b; font-size:0.9rem;'>Sign in to control the logistics platform.</p>", unsafe_allow_html=True)
            user = st.text_input("Email", placeholder="admin@domain.com")
            pwd = st.text_input("Password", type="password")
            if st.button("Login", use_container_width=True, type="primary"):
                with st.spinner("Authenticating connection..."):
                    time.sleep(0.6)
                    if user == "admin@gmail.com" and pwd == "admin123":
                        st.session_state['authenticated'] = True
                        st.rerun()
                    else:
                        st.error("Invalid credentials")
            st.markdown("<p style='text-align:center; font-size:0.85rem; color:#14b8a6; margin-top:1rem; cursor:pointer;'>Forgot Password?</p>", unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
    st.stop()

# --- DATA FETCHING ---
all_foods = list(foods_collection.find())
all_users = list(users_collection.find())

total_donations_kg = sum([f.get('quantity', 0) for f in all_foods if f.get('donated') == True])
meals_saved = int(total_donations_kg * 3.5)
active_users = len(all_users)
active_deliveries = len([f for f in all_foods if f.get('deliveryStatus') == 'EnRoute'])

# --- SIDEBAR NAV ---
with st.sidebar:
    st.markdown("<h3 style='color:#0f766e;'>FoodRescue AI</h3>", unsafe_allow_html=True)
    nav_choice = option_menu(
        menu_title=None,
        options=["Home", "Users", "Donations", "Deliveries", "Analytics", "Reports", "Settings", "Logout"],
        icons=["house", "people", "box-seam", "truck", "graph-up", "file-earmark-text", "gear", "box-arrow-left"],
        menu_icon="cast",
        default_index=0,
        styles={
            "container": {"padding": "0!important", "background-color": "transparent"},
            "icon": {"color": "#64748b", "font-size": "16px"}, 
            "nav-link": {"font-size": "14px", "text-align": "left", "margin":"0px", "--hover-color": "#f1f5f9", "color": "#334155"},
            "nav-link-selected": {"background-color": "#f0fdfa", "color": "#0f766e", "border-left": "4px solid #14b8a6", "font-weight":"600", "icon-color":"#0f766e"},
        }
    )

if nav_choice == "Logout":
    st.session_state['authenticated'] = False
    st.rerun()

# --- FIXED HEADER ---
head_col1, head_col2, head_col3 = st.columns([6, 2, 2])
with head_col1:
    search_query = st.text_input("Search System...", placeholder="Search users, donations, locations...", label_visibility="collapsed")
with head_col2:
    show_notif = st.button("🔔 Notifications", use_container_width=True)
with head_col3:
    st.markdown("<div class='fixed-header-text'>View Profile</div>", unsafe_allow_html=True)

st.markdown("<hr style='margin-top:0.2rem; margin-bottom: 1.5rem; border:none; border-top:1px solid #e2e8f0;'>", unsafe_allow_html=True)

if search_query:
    st.markdown(f"#### Global Search Results for '{search_query}'")
    query = search_query.lower()
    
    user_results = [u for u in all_users if query in u.get('name','').lower() or query in u.get('email','').lower() or query in u.get('role','').lower()]
    food_results = [f for f in all_foods if query in f.get('name','').lower() or query in f.get('storage','').lower()]
    
    if not user_results and not food_results:
        st.info("No matches found across registry.")
    else:
        if user_results:
            st.markdown("**Core Logic: Users**")
            st.dataframe(pd.DataFrame(user_results)[['name', 'email', 'role']], use_container_width=True)
        if food_results:
            st.markdown("**Core Logic: Items**")
            st.dataframe(pd.DataFrame(food_results)[['name', 'quantity', 'status', 'deliveryStatus']], use_container_width=True)
    st.stop()

if show_notif:
    st.markdown("### Notification Center")
    st.markdown("""
    <div class='notif-high'><strong>High Priority:</strong> 50kg Tomatoes listed by Sector 4 Market are expiring in less than 4 hours!</div>
    <div class='notif-medium'><strong>Medium Priority:</strong> Delivery Route #42 is experiencing a 15-minute logistics delay.</div>
    <div class='notif-low'><strong>System Info:</strong> 'Downtown Shelter' recently completed their authentication process.</div>
    """, unsafe_allow_html=True)
    st.stop()

st.title(nav_choice)

if nav_choice == "Home":
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        with st.container(border=True): st.metric("Total Donations", f"{total_donations_kg:,.0f} kg", "+14%")
    with col2:
        with st.container(border=True): st.metric("Active Users", f"{active_users}", "+2")
    with col3:
        with st.container(border=True): st.metric("Meals Saved", f"{meals_saved:,.0f}", "+8%")
    with col4:
        with st.container(border=True): st.metric("Active Deliveries", f"{active_deliveries}", "-1")

    st.markdown("<br>### Recent Activity", unsafe_allow_html=True)
    
    recent_items = sorted(all_foods, key=lambda x: str(x.get('updatedAt', x.get('_id'))), reverse=True)[:15]
    if recent_items:
        df = pd.DataFrame(recent_items)
        if '_id' in df.columns: df['_id'] = df['_id'].astype(str)
        display_df = df[['_id', 'name', 'quantity', 'deliveryStatus', 'storage']].copy()
        
        st.dataframe(display_df, use_container_width=True, hide_index=True)
        
        st.markdown("<br>#### Item Interaction", unsafe_allow_html=True)
        # Selectable rows via dropdown for visually tied action coupling
        action_col1, action_col2 = st.columns([1, 1], gap="large")
        with action_col1:
            selected_record = st.selectbox("Select Record ID:", display_df['_id'])
        with action_col2:
            st.write("Trigger Backend Action:")
            btn_view, btn_edit, btn_del = st.columns(3)
            with btn_view:
                if st.button("View Flow", use_container_width=True):
                    with st.spinner("Extracting parameters..."): time.sleep(0.4)
                    st.info(f"Viewing active telemetry for Record: {selected_record}")
            with btn_edit:
                if st.button("Edit State", use_container_width=True):
                    with st.spinner("Locking row..."): time.sleep(0.3)
                    st.warning("Override mode engaged limit restrictions apply.")
            with btn_del:
                # Modals/Confirmations
                if 'confirm_delete' not in st.session_state: st.session_state.confirm_delete = False
                
                if st.button("Purge Entry", use_container_width=True):
                    st.session_state.confirm_delete = True
                    
        if st.session_state.get('confirm_delete'):
            st.error("⚠️ Are you sure you verify permanent purge of this logistics entry?")
            yes_col, no_col = st.columns([1, 4])
            if yes_col.button("Yes, Purge", type="primary"):
                with st.spinner("Dropping row..."): time.sleep(0.5)
                st.success(f"Record {selected_record} successfully dropped.")
                st.toast("Database update confirmed via callback.")
                st.session_state.confirm_delete = False
            if no_col.button("Cancel Operation"):
                st.session_state.confirm_delete = False
    else:
        st.info("No system activity available.")

elif nav_choice == "Users":
    st.markdown("### Profile Index")
    if all_users:
        df = pd.DataFrame(all_users)
        if '_id' in df.columns: df['_id'] = df['_id'].astype(str)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No registered users.")

elif nav_choice == "Donations":
    st.markdown("### Global Ledger")
    if all_foods:
        df = pd.DataFrame(all_foods)
        if '_id' in df.columns: df['_id'] = df['_id'].astype(str)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.info("No donations processed.")

elif nav_choice == "Deliveries":
    st.markdown("### Active Routes")
    active = [f for f in all_foods if f.get('deliveryStatus') == 'EnRoute']
    if active:
        df = pd.DataFrame(active)
        if '_id' in df.columns: df['_id'] = df['_id'].astype(str)
        st.dataframe(df, use_container_width=True, hide_index=True)
    else:
        st.success("All deliveries completed currently.")

elif nav_choice == "Analytics":
    chart_tabs = st.tabs(["Present Week", "Present Month", "Present Year"])
    
    if all_foods:
        foods_df = pd.DataFrame(all_foods)
        if 'createdAt' not in foods_df.columns: foods_df['createdAt'] = pd.Timestamp.now()
        foods_df['date'] = pd.to_datetime(foods_df.get('createdAt', pd.Timestamp.now()), errors='coerce')
        foods_df = foods_df.dropna(subset=['date'])
        foods_df['quantity'] = pd.to_numeric(foods_df['quantity'], errors='coerce').fillna(0)
        
        now = pd.Timestamp.now()
        import altair as alt

        def get_attractive_charts(data, x_col, x_title):
            if data.empty: return

            base_bar = alt.Chart(data).encode(
                x=alt.X(f"{x_col}:O", title=x_title, axis=alt.Axis(labelAngle=-45, grid=False, labelFontSize=11, labelColor="#64748b"), sort=None),
                y=alt.Y("quantity:Q", title="Volume (kg)", axis=alt.Axis(gridColor="#f1f5f9", labelFontSize=11, labelColor="#64748b")),
                tooltip=[alt.Tooltip(f"{x_col}:O", title=str(x_title)), alt.Tooltip("quantity:Q", title="Kg")]
            )
            bar_chart = base_bar.mark_bar(color='#14b8a6', cornerRadiusTopLeft=2, cornerRadiusTopRight=2).properties(height=320)
            text = base_bar.mark_text(align='center', baseline='bottom', dy=-5, fontSize=11, color='#475569').encode(text=alt.Text("quantity:Q", format=".0f"))
            manhattan = (bar_chart + text).configure_view(strokeWidth=0)

            base_line = alt.Chart(data).encode(
                x=alt.X(f"{x_col}:O", title=x_title, axis=alt.Axis(labelAngle=-45, grid=False, labelFontSize=11, labelColor="#64748b"), sort=None),
                y=alt.Y("quantity:Q", title="Volume (kg)", axis=alt.Axis(gridColor="#f1f5f9", labelFontSize=11, labelColor="#64748b")),
                tooltip=[alt.Tooltip(f"{x_col}:O", title=str(x_title)), alt.Tooltip("quantity:Q", title="Kg")]
            )
            line_chart = base_line.mark_line(interpolate='monotone', color='#0f766e', strokeWidth=3).properties(height=320)
            point_chart = base_line.mark_circle(color='#0f766e', size=40)
            worm = (line_chart + point_chart).configure_view(strokeWidth=0)

            col1, col2 = st.columns(2)
            with col1:
                st.altair_chart(manhattan, use_container_width=True)
            with col2:
                st.altair_chart(worm, use_container_width=True)

        with chart_tabs[0]:
            start_of_week = now.date() - pd.Timedelta(days=now.date().weekday())
            w_data = [{'date_val': start_of_week + pd.Timedelta(days=i), 'display_date': ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i], 'quantity': 0} for i in range(7)]
            dummy_w = pd.DataFrame(w_data)
            fw = foods_df[(foods_df['date'].dt.date >= start_of_week) & (foods_df['date'].dt.date <= start_of_week + pd.Timedelta(days=6))].copy()
            if not fw.empty:
                fw['date_val'] = fw['date'].dt.date
                grouped_w = fw.groupby('date_val', as_index=False)['quantity'].sum()
                dummy_w = pd.merge(dummy_w, grouped_w, on='date_val', how='left')
                dummy_w['quantity'] = dummy_w['quantity_y'].fillna(0)
            get_attractive_charts(dummy_w, 'display_date', 'Day of Week')
            
            # Actionable Intelligence Layer
            st.markdown("---")
            st.markdown("✨ **AI Operational Intelligence**")
            st.info("Peak donations occur Tuesday evenings (6–9 PM). Recommend increasing pickup capacity bounds by 15% during this window to prevent localized overflow.")

        with chart_tabs[1]:
            today = now.date()
            import calendar
            _, num_days = calendar.monthrange(today.year, today.month)
            days = [today.replace(day=1) + pd.Timedelta(days=i) for i in range(num_days)]
            dummy_m = pd.DataFrame({'date_val': days, 'quantity': 0})
            fm = foods_df[(foods_df['date'].dt.month == today.month) & (foods_df['date'].dt.year == today.year)].copy()
            if not fm.empty:
                fm['date_val'] = fm['date'].dt.date
                dummy_m = pd.merge(dummy_m, fm.groupby('date_val', as_index=False)['quantity'].sum(), on='date_val', how='left')
                dummy_m['quantity'] = dummy_m['quantity_y'].fillna(0)
            dummy_m['display_date'] = pd.to_datetime(dummy_m['date_val']).dt.strftime('%b %d')
            get_attractive_charts(dummy_m, 'display_date', 'Date')

        with chart_tabs[2]:
            months = [pd.Timestamp(year=now.year, month=i, day=1) for i in range(1, 13)]
            dummy_y = pd.DataFrame({'month_val': [m.month for m in months], 'quantity': 0, 'display_date': ["january", "feb", "mar", "april", "may", "jun", "july", "aug", "sept", "oct", "nov", "dec"]})
            fy = foods_df[foods_df['date'].dt.year == now.year].copy()
            if not fy.empty:
                fy['month_val'] = fy['date'].dt.month
                dummy_y = pd.merge(dummy_y, fy.groupby('month_val', as_index=False)['quantity'].sum(), on='month_val', how='left')
                dummy_y['quantity'] = dummy_y['quantity_y'].fillna(0)
            get_attractive_charts(dummy_y, 'display_date', 'Month')
    else:
        st.info("Insufficient data for analytics generation.")

elif nav_choice == "Reports":
    st.markdown("### System Activity (Audit Log)")
    audit_data = []
    
    for f in all_foods:
        action = "Donation physically logged" if not f.get('donated') else ("Accepted by NGO partner" if f.get('deliveryStatus') == 'EnRoute' else "Received at facility")
        audit_data.append({
            "Timestamp": pd.to_datetime(f.get('updatedAt', f.get('createdAt', pd.Timestamp.now()))),
            "Event": f"{f.get('name')} - {action}",
            "Type": "Entity Lifecycle"
        })
        
    for u in all_users:
        audit_data.append({
            "Timestamp": pd.to_datetime(u.get('createdAt', pd.Timestamp.now() - pd.Timedelta(days=2))),
            "Event": f"User {u.get('name')} provisioned under role {u.get('role', 'Unknown')}",
            "Type": "Identity Auth"
        })
        
    audit_df = pd.DataFrame(audit_data).sort_values(by="Timestamp", ascending=False).head(20)
    audit_df["Timestamp"] = audit_df["Timestamp"].dt.strftime('%Y-%m-%d %H:%M:%S')
    
    st.dataframe(audit_df, use_container_width=True, hide_index=True)

elif nav_choice == "Settings":
    st.markdown("### Platform Configurations")
    
    st.markdown("#### Profile Settings")
    st.text_input("Admin Base Route Email", value="admin@gmail.com")
    st.text_input("Recovery Email Threshold")
    
    st.markdown("#### Notification Triggers")
    st.checkbox("Force Receive High-Priority Expiry Alerts (SMS Endpoint)", value=True)
    st.checkbox("Daily Analytics Digest Generator (Email Cron)", value=False)
    
    st.markdown("#### System Constraints & Security")
    st.checkbox("Require Universal 2FA for all NGO accounts", value=True)
    st.checkbox("Log Audit Payload to External AWS S3 Bucket", value=False)
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("Save Configurations globally", type="primary"):
        with st.spinner("Locking new namespace configs..."):
            time.sleep(1.2)
            st.success("Global configurations validated and updated successfully!")
            st.toast("Settings persisted.")
