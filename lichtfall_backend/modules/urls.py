from django.urls import path
from . import views

urlpatterns = [
    # Authentication Endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/login/', views.login_user, name='login'),
    
    # Game Flow Endpoints
    path('game/start/', views.start_game, name='game_start'),
    path('game/state/', views.get_game_state, name='game_state'),
    path('game/choice/', views.make_choice, name='game_choice'),
    path('game/equip/', views.equip_item, name='equip_item'),
    path('game/unequip/', views.unequip_item, name='unequip_item'),
    path('game/craft/', views.craft_item, name='craft_item'),
    path('game/travel/', views.travel, name='travel'),
    path('game/inn/', views.rest_at_inn, name='rest_at_inn'),
    path('game/allocate_stat/', views.allocate_stat, name='allocate_stat'),
    path('game/settings/', views.update_settings, name='update_settings'),
    path('game/save/', views.save_game_state, name='save_game_state'),
    path('game/load/', views.load_game_state, name='load_game_state'),
    path('game/delete_save/', views.delete_save_slot, name='delete_save_slot'),
    path('game/saves/', views.list_save_slots, name='list_save_slots'),
]
