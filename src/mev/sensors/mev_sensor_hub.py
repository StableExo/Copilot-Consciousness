import time

class MEVSensorHub:
    def __init__(self):
        self.mempool_congestion_sensor = MempoolCongestionSensor()
        self.searcher_density_sensor = SearcherDensitySensor()
        self.cache = {}
        self.cache_ttl = 12

    def _cache_result(self, key, value):
        self.cache[key] = (value, time.time())

    def _is_cache_valid(self, key):
        cached_value = self.cache.get(key)
        if cached_value:
            value, timestamp = cached_value
            if time.time() - timestamp < self.cache_ttl:
                return value
        return None

    def get_congestion_score(self):
        cached_result = self._is_cache_valid('congestion_score')
        if cached_result is not None:
            return cached_result
        congestion_score = self.mempool_congestion_sensor.get_score()
        self._cache_result('congestion_score', congestion_score)
        return congestion_score

    def get_density_score(self):
        cached_result = self._is_cache_valid('density_score')
        if cached_result is not None:
            return cached_result
        density_score = self.searcher_density_sensor.get_density()
        self._cache_result('density_score', density_score)
        return density_score

    def calculate_composite_risk(self):
        density = self.get_density_score()
        congestion = self.get_congestion_score()
        composite_risk = density * (1 - congestion * 0.5)
        return composite_risk

    def get_metrics(self):
        congestion_score = self.get_congestion_score()
        density_score = self.get_density_score()
        composite_risk = self.calculate_composite_risk()
        return {
            "congestion_score": congestion_score,
            "density_score": density_score,
            "composite_risk": composite_risk
        }

class MempoolCongestionSensor:
    def get_score(self):
        # Placeholder for actual congestion logic
        return 0.7  # Example value

class SearcherDensitySensor:
    def get_density(self):
        # Placeholder for actual density logic
        return 0.5  # Example value
