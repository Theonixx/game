from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None):
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')
            
        user = self.model(
            username=username,
            email=self.normalize_email(email),
        )
        user.set_password(password)
        user.save(using=self._db)
        return user
        
    def create_superuser(self, username, email, password=None):
        user = self.create_user(username, email, password=password)
        user.is_admin = True
        user.is_staff = True
        user.save(using=self._db)
        return user

class User(AbstractBaseUser):
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    def __str__(self):
        return self.username
        
    def has_perm(self, perm, obj=None):
        return True

    def has_module_perms(self, app_label):
        return True

class Location(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_hidden = models.BooleanField(default=False)

class StoryNode(models.Model):
    title = models.CharField(max_length=200)
    narrative_text = models.TextField()
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='nodes')

class GameSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    current_node = models.ForeignKey(StoryNode, on_delete=models.CASCADE, related_name='active_sessions')
    current_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='active_sessions')
    is_active = models.BooleanField(default=True)
    last_played = models.DateTimeField(auto_now=True)

class PlayerStats(models.Model):
    session = models.OneToOneField(GameSession, on_delete=models.CASCADE, related_name='stats')
    health = models.IntegerField(default=100)
    sanity = models.IntegerField(default=100)
    reputation = models.IntegerField(default=0)
    overheat = models.IntegerField(default=0)
    status_ailments = models.JSONField(default=dict, blank=True)
    elemental_resistances = models.JSONField(default=dict, blank=True)
    mana = models.IntegerField(default=100)
    defense = models.IntegerField(default=0)
    
    # Phase 2 & 4 Core Additions
    level = models.IntegerField(default=1)
    exp = models.IntegerField(default=0)
    stat_points = models.IntegerField(default=0)
    scrap = models.IntegerField(default=0)
    base_strength = models.IntegerField(default=10)
    base_intelligence = models.IntegerField(default=10)
    base_dexterity = models.IntegerField(default=10)

class Choice(models.Model):
    node = models.ForeignKey(StoryNode, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=255)
    next_node = models.ForeignKey(StoryNode, on_delete=models.CASCADE, related_name='incoming_choices')

class Consequence(models.Model):
    EFFECT_CHOICES = [
        ('health', 'Health'),
        ('sanity', 'Sanity'),
        ('reputation', 'Reputation'),
        ('item', 'Item'),
        ('flag', 'Flag'),
    ]
    choice = models.ForeignKey(Choice, on_delete=models.CASCADE, related_name='consequences')
    effect_type = models.CharField(max_length=20, choices=EFFECT_CHOICES)
    reference_id = models.IntegerField(null=True, blank=True)
    effect_value = models.IntegerField()

class Item(models.Model):
    item_name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_consumable = models.BooleanField(default=False)
    equippable_slot = models.CharField(max_length=50, blank=True, null=True)
    strength_boost = models.IntegerField(default=0)
    mana_boost = models.IntegerField(default=0)
    weight = models.IntegerField(default=0)
    defense_boost = models.IntegerField(default=0)

class Inventory(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='inventory')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)

class Equipment(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='equipment')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    slot = models.CharField(max_length=50)

class PlayerChoice(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='choices_made')
    choice = models.ForeignKey(Choice, on_delete=models.CASCADE)
    chosen_at = models.DateTimeField(auto_now_add=True)

class Recipe(models.Model):
    ingredient_1 = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='recipe_ing1')
    ingredient_2 = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='recipe_ing2')
    result_item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='recipe_result')

class SaveSlot(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='saves')
    slot_name = models.CharField(max_length=50, default='slot1')
    save_name = models.CharField(max_length=100)
    saved_node = models.ForeignKey(StoryNode, on_delete=models.CASCADE)
    state_data = models.TextField(blank=True, null=True)
    is_autosave = models.BooleanField(default=False)
    saved_at = models.DateTimeField(auto_now_add=True)

class GameLog(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='logs')
    action = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    sound_volume = models.IntegerField(default=50)
    text_speed = models.IntegerField(default=50)
    auto_save = models.BooleanField(default=True)

class Quest(models.Model):
    key = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    reward = models.CharField(max_length=200)
    note = models.TextField(blank=True, null=True)

class PlayerQuest(models.Model):
    session = models.ForeignKey(GameSession, on_delete=models.CASCADE, related_name='quests')
    quest = models.ForeignKey(Quest, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='active')
